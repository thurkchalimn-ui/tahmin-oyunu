// ============================================================================
// Bu script GitHub Actions tarafından zamanlanmış olarak (örn. 5 dakikada bir)
// çalıştırılır. İki işi vardır:
//   1) Başlamış ama henüz bitmemiş maçlar için ANLIK SKORU (canlı skor) çeker
//      ve Firestore'a yazar - site bunu gerçek zamanlı okuyup gösterir.
//   2) Kickoff saatinin üzerinden 3 saat geçtiği halde sonucu hâlâ girilmemiş
//      maçları bulup, kesin sonucu yazar, tahminleri değerlendirir, serileri günceller.
// Maçı API'de bulamazsa (takım adı eşleşmezse vb.) sessizce atlar; o maç admin
// panelinden elle girilmeye devam edilebilir.
//
// NOT: GitHub Actions'ın ücretsiz zamanlanmış görevleri saniyesinde değil,
// birkaç dakika gecikmeli çalışabilir - "canlı" skor bu yüzden gerçek zamanlıdan
// birkaç dakika geride kalabilir. Tamamen anlık istiyorsan ücretli bir servis
// (Cloud Functions + Cloud Scheduler, saniyeler içinde tetiklenebilir) gerekir.
//
// Gerekli ortam değişkenleri (GitHub Actions "Secrets" olarak eklenir):
//   FIREBASE_SERVICE_ACCOUNT_KEY  -> Firebase servis hesabı JSON'ının tamamı (tek satır)
//   RAPIDAPI_KEY                  -> RapidAPI üzerinden alınan API-Football anahtarı
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const STREAK_TARGET = 15; // src/utils/streakUtils.ts ile aynı değer - değiştirirsen orada da değiştir
const RESULT_DELAY_MS = 3 * 60 * 60 * 1000; // Maç başlangıcından 3 saat sonra kontrol et
const REMINDER_WINDOW_MS = 30 * 60 * 1000; // Maç başlamadan 30 dakika önce hatırlatma gönder

// --- Firebase Admin SDK başlatma -------------------------------------------
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('HATA: FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}
const serviceAccount = JSON.parse(serviceAccountRaw);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const messaging = getMessaging();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
if (!RAPIDAPI_KEY) {
  console.error('HATA: RAPIDAPI_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
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

      // Artık geçersiz olan token'ları temizle (kullanıcı izni kaldırmış/uygulamayı silmiş olabilir)
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

// --- Yardımcı fonksiyonlar ---------------------------------------------------

/** Takım adlarını karşılaştırılabilir hale getirir (küçük harf, boşluk/aksan temizliği). */
function normalizeTeamName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // aksan işaretlerini kaldır
    .replace(/[^a-z0-9]/g, ''); // harf/rakam dışını kaldır
}

/** Sıralanmış (kronolojik) tahminlerden güncel seriyi hesaplar (src/utils/streakUtils.ts ile aynı mantık). */
function calculateCurrentStreak(orderedPredictions) {
  let streak = 0;
  for (const p of orderedPredictions) {
    if (p.isCorrect === null) continue;
    streak = p.isCorrect ? streak + 1 : 0;
  }
  return streak;
}

function calculateBestStreak(orderedPredictions) {
  let streak = 0;
  let best = 0;
  for (const p of orderedPredictions) {
    if (p.isCorrect === null) continue;
    streak = p.isCorrect ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  return best;
}

/** İki maçı kronolojik olarak karşılaştırır (aynı saatte ev sahibi adına göre alfabetik) - src/utils/matchNumbering.ts ile aynı mantık. */
function compareMatchesAscending(a, b) {
  const timeDiff = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
  if (timeDiff !== 0) return timeDiff;
  return a.homeTeam.localeCompare(b.homeTeam, 'tr');
}

/** Verilen maç ID'lerinin kickoffAt ve homeTeam bilgilerini toplu olarak getirir. */
async function getMatchOrderingInfoByIds(matchIds) {
  const uniqueIds = [...new Set(matchIds)];
  const result = new Map();
  if (uniqueIds.length === 0) return result;

  const chunks = [];
  for (let i = 0; i < uniqueIds.length; i += 30) {
    chunks.push(uniqueIds.slice(i, i + 30));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await db.collection('matches').where('__name__', 'in', chunk).get();
      snap.docs.forEach((d) => {
        const data = d.data();
        result.set(d.id, { kickoffAt: data.kickoffAt ?? '', homeTeam: data.homeTeam ?? '' });
      });
    }),
  );
  return result;
}

/**
 * Bir kullanıcının serisini yeniden hesaplayıp Firestore'a yazar. Sıralama,
 * maçların gerçek kickoffAt (başlama saati, aynı saatte ev sahibi takım adına
 * göre alfabetik) bilgisine göre yapılır - admin panelinde eklenme sırasına göre
 * DEĞİL. Bu, src/services/userService.ts'deki aynı isimli fonksiyonla ve
 * kullanıcının ana sayfada/profilde GÖRDÜĞÜ sıralamayla birebir aynıdır.
 */
async function recalculateUserStreak(uid) {
  const predSnap = await db.collection('predictions').where('userId', '==', uid).get();
  const predictions = predSnap.docs.map((d) => d.data());
  const resolved = predictions.filter((p) => p.isCorrect !== null);

  const orderingInfo = await getMatchOrderingInfoByIds(resolved.map((p) => p.matchId));
  const ordered = resolved
    .map((p) => ({ ...p, ...(orderingInfo.get(p.matchId) ?? { kickoffAt: '', homeTeam: '' }) }))
    .sort(compareMatchesAscending);

  const currentStreak = calculateCurrentStreak(ordered);
  const bestStreak = calculateBestStreak(ordered);
  const totalPredictions = resolved.length;
  const correctPredictions = resolved.filter((p) => p.isCorrect === true).length;

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const existingBadges = userSnap.data()?.badges ?? [];
  const badges = [...existingBadges];
  if (currentStreak === STREAK_TARGET) {
    badges.push({ streakLength: STREAK_TARGET, achievedAt: new Date().toISOString() });
  }

  await userRef.update({
    currentStreak,
    bestStreak,
    totalPredictions,
    correctPredictions,
    badges,
    updatedAt: Timestamp.now(),
  });
}

/** API-Football'dan verilen tarihe ait tüm maçları çeker. */
async function fetchFixturesForDate(date) {
  const res = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${date}`, {
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    },
  });
  if (!res.ok) {
    throw new Error(`API-Football isteği başarısız: ${res.status} ${res.statusText}`);
  }
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

/** API'den gelen skora göre 'HOME' | 'DRAW' | 'AWAY' sonucunu belirler. Maç bitmemişse null döner. */
function extractResult(fixture) {
  const status = fixture.fixture?.status?.short;
  const finishedStatuses = ['FT', 'AET', 'PEN']; // Normal süre, uzatma, penaltı sonrası biten maçlar
  if (!finishedStatuses.includes(status)) return null;

  const homeGoals = fixture.goals?.home;
  const awayGoals = fixture.goals?.away;
  if (homeGoals == null || awayGoals == null) return null;

  if (homeGoals > awayGoals) return 'HOME';
  if (homeGoals < awayGoals) return 'AWAY';
  return 'DRAW';
}

/**
 * API'den gelen fikstürden anlık skor bilgisini çıkarır. Maç henüz başlamamışsa
 * (NS) null döner - gösterilecek bir şey yoktur. Devam eden, devre arası, uzatma,
 * ertelenen/iptal edilen maçlar dahil her durumda bir liveScore nesnesi döner;
 * front-end bu `status` koduna göre uygun etiketi ("CANLI", "Devre Arası",
 * "Ertelendi" vb.) kendisi belirler.
 */
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

// --- Ana akış -----------------------------------------------------------------

async function main() {
  console.log('[check-results] Kontrol başlıyor:', new Date().toISOString());

  // Sonucu boş olan tüm maçları çek (Admin SDK'da eşitlik filtresi index gerektirmez)
  const pendingSnap = await db.collection('matches').where('result', '==', null).get();
  const now = Date.now();
  const allPending = pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // --- 1) 30 dakika kala hatırlatma bildirimi (henüz başlamamış maçlar) ---
  const upcomingMatches = allPending.filter((m) => {
    if (m.reminderSent) return false; // Bu maç için hatırlatma zaten gönderildi
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
    }
    // Tahmin yapan kimse olmasa bile bir daha denenmesin diye işaretle
    await db.collection('matches').doc(match.id).update({ reminderSent: true });
  }

  // --- 2) Başlamış maçlar için canlı skor / kesin sonuç ---
  // Başlamış (kickoff geçmiş) ve henüz sonuçlanmamış tüm maçlar: canlı skor ve/veya
  // final sonuç için aday. Henüz başlamamış maçlar için API'ye hiç sorulmaz.
  const startedMatches = allPending.filter((m) => new Date(m.kickoffAt).getTime() <= now);

  if (startedMatches.length === 0) {
    console.log('[check-results] Başlamış, sonucu bekleyen maç yok. Çıkılıyor.');
    return;
  }
  console.log(`[check-results] ${startedMatches.length} başlamış maç kontrol edilecek.`);

  // API isteklerini azaltmak için maçları tarihe göre grupla (günde 1 istek)
  const byDate = new Map();
  for (const match of startedMatches) {
    if (!byDate.has(match.date)) byDate.set(match.date, []);
    byDate.get(match.date).push(match);
  }

  let finalizedCount = 0;
  let liveUpdatedCount = 0;

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
        console.log(`[check-results] Eşleşme bulunamadı: ${match.homeTeam} vs ${match.awayTeam} (${date})`);
        continue;
      }

      const isDueForFinal = new Date(match.kickoffAt).getTime() + RESULT_DELAY_MS <= now;
      const result = extractResult(fixture);

      if (result && isDueForFinal) {
        // --- Kesin sonucu yaz, tahminleri değerlendir, serileri güncelle ---
        await db.collection('matches').doc(match.id).update({ result, liveScore: null });

        const predSnap = await db.collection('predictions').where('matchId', '==', match.id).get();
        const affectedUserIds = new Set();
        const correctUserIds = [];
        const wrongUserIds = [];
        for (const predDoc of predSnap.docs) {
          const data = predDoc.data();
          const isCorrect = data.choice === result;
          affectedUserIds.add(data.userId);
          (isCorrect ? correctUserIds : wrongUserIds).push(data.userId);
          await predDoc.ref.update({ isCorrect, resolvedAt: Timestamp.now() });
        }
        for (const uid of affectedUserIds) {
          await recalculateUserStreak(uid);
        }

        // Maç sonuçlandı bildirimi (push)
        const matchLabel = `${match.homeTeam} vs ${match.awayTeam}`;
        if (correctUserIds.length > 0) {
          await sendPushToUsers(correctUserIds, '✅ Doğru Tahmin!', `${matchLabel} maçını doğru bildin.`);
        }
        if (wrongUserIds.length > 0) {
          await sendPushToUsers(wrongUserIds, '❌ Yanlış Tahmin', `${matchLabel} maçında tahminin tutmadı.`);
        }

        finalizedCount += 1;
        console.log(
          `[check-results] Sonuç yazıldı: ${match.homeTeam} ${result} ${match.awayTeam} (${predSnap.size} tahmin güncellendi)`,
        );
        continue;
      }

      // --- Henüz kesinleşmemiş: sadece anlık skoru güncelle ---
      const liveScore = extractLiveScore(fixture);
      if (liveScore) {
        await db.collection('matches').doc(match.id).update({ liveScore });
        liveUpdatedCount += 1;
        console.log(
          `[check-results] Canlı skor güncellendi: ${match.homeTeam} ${liveScore.homeGoals}-${liveScore.awayGoals} ${match.awayTeam} (${liveScore.status})`,
        );
      }
    }
  }

  console.log(
    `[check-results] Tamamlandı. ${finalizedCount} maç sonuçlandı, ${liveUpdatedCount} maçın canlı skoru güncellendi.`,
  );
}

main().catch((err) => {
  console.error('[check-results] Beklenmeyen hata:', err);
  process.exit(1);
});
