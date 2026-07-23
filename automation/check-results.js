// ============================================================================
// Bu script GitHub Actions tarafından zamanlanmış olarak (cron-job.org
// tetiklemesiyle, güvenilir şekilde) çalışır. Üç işi vardır:
//   1) Admin panelinden ELLE girilen sonuçlar için bekleyen bildirimleri gönderir
//      (notificationQueue koleksiyonu).
//   2) Maç başlamadan 30 dakika önce hatırlatma bildirimi gönderir.
//   3) [OPSİYONEL - API_FOOTBALL_KEY tanımlıysa] Başlamış ama sonucu admin tarafından
//      henüz girilmemiş maçlar için ANLIK SKORU (canlı skor) çeker ve Firestore'a
//      yazar - site bunu gerçek zamanlı okuyup gösterir.
//
// ÖNEMLİ: Kesin sonuç (match.result) HİÇBİR ZAMAN burada otomatik belirlenmez -
// bu her zaman admin panelinden ELLE girilir. Bu script sadece maç sırasında
// gösterilecek anlık skoru günceller, resmi sonucu değil.
//
// NOT: GitHub Actions'ın ücretsiz zamanlanmış görevleri saniyesinde değil,
// birkaç dakika gecikmeli çalışabilir.
//
// Gerekli ortam değişkenleri (GitHub Actions "Secrets" olarak eklenir):
//   FIREBASE_SERVICE_ACCOUNT_KEY  -> ZORUNLU. Firebase servis hesabı JSON'ının tamamı (tek satır)
//   API_FOOTBALL_KEY                  -> OPSİYONEL. Sadece canlı skor istiyorsan gerekir.
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const REMINDER_WINDOW_MS = 30 * 60 * 1000; // Maç başlamadan 30 dakika önce hatırlatma gönder

// --- Firebase Admin SDK başlatma (ZORUNLU) ---------------------------------
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('HATA: FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}
const serviceAccount = JSON.parse(serviceAccountRaw);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const messaging = getMessaging();

// API_FOOTBALL_KEY opsiyonel: tanımlı değilse canlı skor adımı sessizce atlanır,
// bildirim/hatırlatma işlevleri bundan tamamen bağımsız çalışmaya devam eder.
// Bu anahtar RapidAPI'den DEĞİL, doğrudan api-football.com'dan (api-sports.io
// altyapısı) alınır - ücretsiz, kredi kartsız, günde 100 istek.
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
if (!API_FOOTBALL_KEY) {
  console.warn('[check-results] UYARI: API_FOOTBALL_KEY tanımlı değil - canlı skor adımı atlanacak.');
}

/**
 * Verilen kullanıcı ID'lerine push bildirimi gönderir. Her kullanıcının
 * kayıtlı FCM token'larını (bkz. src/services/notificationService.ts,
 * users/{uid}.fcmTokens alanı) okuyup hepsine gönderir. Token artık geçersizse
 * (kullanıcı bildirimleri kapattıysa/uygulamayı kaldırdıysa) sessizce atlanır.
 */
async function sendPushToUsers(userIds, title, body) {
  for (const uid of userIds) {
    try {
      const userSnap = await db.collection('users').doc(uid).get();
      const tokens = userSnap.data()?.fcmTokens ?? [];
      if (tokens.length === 0) continue;

      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
      });

      const invalidTokens = response.responses
        .map((r, i) => (!r.success ? tokens[i] : null))
        .filter(Boolean);
      if (invalidTokens.length > 0) {
        const validTokens = tokens.filter((t) => !invalidTokens.includes(t));
        await db.collection('users').doc(uid).update({ fcmTokens: validTokens });
      }
    } catch (err) {
      console.error(`[check-results] Bildirim gönderilemedi (${uid}):`, err.message);
    }
  }
}

/**
 * Admin panelinden elle sonuç girildiğinde `notificationQueue` koleksiyonuna
 * bırakılan bekleyen bildirimleri okuyup gönderir, sonra siler.
 */
async function processNotificationQueue() {
  const snap = await db.collection('notificationQueue').get();
  if (snap.empty) return;

  for (const queueDoc of snap.docs) {
    const { userId, title, body } = queueDoc.data();
    if (userId && title) {
      await sendPushToUsers([userId], title, body ?? '');
    }
    await queueDoc.ref.delete();
  }
  console.log(`[check-results] Kuyruktaki ${snap.size} bildirim gönderildi.`);
}

// --- Canlı skor yardımcı fonksiyonları (sadece API_FOOTBALL_KEY varsa kullanılır) ---

/** Takım adlarını karşılaştırılabilir hale getirir (küçük harf, boşluk/aksan temizliği). */
function normalizeTeamName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** API-Football'dan (doğrudan api-sports.io altyapısı, RapidAPI'siz) verilen tarihe ait maçları çeker. */
async function fetchFixturesForDate(date) {
  const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
    headers: {
      'x-apisports-key': API_FOOTBALL_KEY,
    },
  });
  if (!res.ok) throw new Error(`API-Football isteği başarısız: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.response ?? [];
}

/** Bizim kayıtlı maçımızı, API'den gelen fikstür listesinden takım adına göre bulur. */
function findMatchingFixture(match, fixtures) {
  const home = normalizeTeamName(match.homeTeam);
  const away = normalizeTeamName(match.awayTeam);
  return fixtures.find((f) => {
    const fHome = normalizeTeamName(f.teams?.home?.name ?? '');
    const fAway = normalizeTeamName(f.teams?.away?.name ?? '');
    return fHome === home && fAway === away;
  });
}

/** API'den gelen fikstürden anlık skor bilgisini çıkarır. Maç henüz başlamamışsa (NS) null döner. */
function extractLiveScore(fixture) {
  const status = fixture.fixture?.status?.short;
  if (!status || status === 'NS') return null;

  const homeGoals = fixture.goals?.home ?? 0;
  const awayGoals = fixture.goals?.away ?? 0;
  const elapsed = fixture.fixture?.status?.elapsed;

  return {
    homeGoals,
    awayGoals,
    status,
    minute: elapsed != null ? String(elapsed) : null,
  };
}

/**
 * Başlamış ama admin tarafından sonucu henüz girilmemiş maçlar için anlık
 * skoru çeker ve Firestore'a yazar. Kesin sonucu (match.result) ASLA değiştirmez.
 */
async function updateLiveScores(allPending, now) {
  const startedMatches = allPending.filter((m) => new Date(m.kickoffAt).getTime() <= now);
  if (startedMatches.length === 0) return;

  const byDate = new Map();
  for (const match of startedMatches) {
    if (!byDate.has(match.date)) byDate.set(match.date, []);
    byDate.get(match.date).push(match);
  }

  let updatedCount = 0;
  for (const [date, matches] of byDate) {
    let fixtures;
    try {
      fixtures = await fetchFixturesForDate(date);
    } catch (err) {
      console.error(`[check-results] ${date} için API isteği başarısız:`, err.message);
      continue;
    }

    for (const match of matches) {
      const fixture = findMatchingFixture(match, fixtures);
      if (!fixture) {
        console.log(
          `[check-results] Eşleşme bulunamadı: ${match.homeTeam} vs ${match.awayTeam} (${date}) - ${fixtures.length} maç içinden hiçbiri isim olarak eşleşmedi.`,
        );
        continue;
      }

      const liveScore = extractLiveScore(fixture);
      if (liveScore) {
        await db.collection('matches').doc(match.id).update({ liveScore });
        updatedCount += 1;
        console.log(
          `[check-results] Canlı skor güncellendi: ${match.homeTeam} ${liveScore.homeGoals}-${liveScore.awayGoals} ${match.awayTeam} (${liveScore.status})`,
        );
      } else {
        console.log(
          `[check-results] Eşleşme bulundu ama skor bilgisi yok (muhtemelen 'NS' - başlamamış): ${match.homeTeam} vs ${match.awayTeam}`,
        );
      }
    }
  }
  console.log(`[check-results] ${updatedCount} maçın canlı skoru güncellendi.`);
}

async function main() {
  console.log('[check-results] Kontrol başlıyor:', new Date().toISOString());

  // --- 1) Admin panelinden elle girilen sonuçlara ait bekleyen bildirimler ---
  await processNotificationQueue();

  const pendingSnap = await db.collection('matches').where('result', '==', null).get();
  const now = Date.now();
  const allPending = pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // --- 2) Maç başlamadan 30 dakika önce hatırlatma bildirimi ---
  const upcomingMatches = allPending.filter((m) => {
    if (m.reminderSent) return false;
    const msUntilKickoff = new Date(m.kickoffAt).getTime() - now;
    return msUntilKickoff > 0 && msUntilKickoff <= REMINDER_WINDOW_MS;
  });

  for (const match of upcomingMatches) {
    const predSnap = await db.collection('predictions').where('matchId', '==', match.id).get();
    const userIds = [...new Set(predSnap.docs.map((d) => d.data().userId))];

    if (userIds.length > 0) {
      await sendPushToUsers(
        userIds,
        '⏰ Maç Yakında Başlıyor',
        `${match.homeTeam} vs ${match.awayTeam} 30 dakika içinde başlıyor!`,
      );
      console.log(`[check-results] Hatırlatma gönderildi: ${match.homeTeam} vs ${match.awayTeam} (${userIds.length} kullanıcı)`);
      await db.collection('matches').doc(match.id).update({ reminderSent: true });
    } else {
      console.log(`[check-results] Henüz tahmin yapan yok, hatırlatma ertelendi: ${match.homeTeam} vs ${match.awayTeam}`);
    }
  }

  // --- 3) Canlı skor güncelleme (sadece API_FOOTBALL_KEY tanımlıysa) ---
  if (API_FOOTBALL_KEY) {
    await updateLiveScores(allPending, now);
  }

  console.log('[check-results] Tamamlandı.');
}

main().catch((err) => {
  console.error('[check-results] Beklenmeyen hata:', err);
  process.exit(1);
});
