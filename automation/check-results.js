// ============================================================================
// Bu script GitHub Actions tarafından zamanlanmış olarak (örn. 15 dakikada bir)
// çalıştırılır. Amacı: kickoff saatinin üzerinden 3 saat geçtiği halde sonucu
// hâlâ girilmemiş maçları bulup, API-Football'dan gerçek sonucu çekmek ve
// Firestore'a yazmaktır. Maçı API'de bulamazsa (takım adı eşleşmezse vb.)
// sessizce atlar; o maç admin panelinden elle girilmeye devam edilebilir.
//
// Gerekli ortam değişkenleri (GitHub Actions "Secrets" olarak eklenir):
//   FIREBASE_SERVICE_ACCOUNT_KEY  -> Firebase servis hesabı JSON'ının tamamı (tek satır)
//   RAPIDAPI_KEY                  -> RapidAPI üzerinden alınan API-Football anahtarı
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const STREAK_TARGET = 15; // src/utils/streakUtils.ts ile aynı değer - değiştirirsen orada da değiştir
const RESULT_DELAY_MS = 3 * 60 * 60 * 1000; // Maç başlangıcından 3 saat sonra kontrol et

// --- Firebase Admin SDK başlatma -------------------------------------------
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('HATA: FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}
const serviceAccount = JSON.parse(serviceAccountRaw);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
if (!RAPIDAPI_KEY) {
  console.error('HATA: RAPIDAPI_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
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

/** Verilen maç ID'lerinin kickoffAt değerlerini toplu olarak getirir. */
async function getKickoffTimesByMatchIds(matchIds) {
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
      snap.docs.forEach((d) => result.set(d.id, d.data().kickoffAt ?? ''));
    }),
  );
  return result;
}

/**
 * Bir kullanıcının serisini yeniden hesaplayıp Firestore'a yazar. Sıralama,
 * maçların gerçek kickoffAt (başlama saati) bilgisine göre yapılır - admin
 * panelinde eklenme sırasına göre DEĞİL (bkz. src/services/userService.ts'deki
 * aynı isimli fonksiyonun yorumu, aynı hata burada da düzeltilmiştir).
 */
async function recalculateUserStreak(uid) {
  const predSnap = await db.collection('predictions').where('userId', '==', uid).get();
  const predictions = predSnap.docs.map((d) => d.data());
  const resolved = predictions.filter((p) => p.isCorrect !== null);

  const kickoffByMatchId = await getKickoffTimesByMatchIds(resolved.map((p) => p.matchId));
  const ordered = resolved
    .map((p) => ({ ...p, kickoffAt: kickoffByMatchId.get(p.matchId) ?? '' }))
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

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

// --- Ana akış -----------------------------------------------------------------

async function main() {
  console.log('[check-results] Kontrol başlıyor:', new Date().toISOString());

  // Sonucu boş olan tüm maçları çek (Admin SDK'da eşitlik filtresi index gerektirmez)
  const pendingSnap = await db.collection('matches').where('result', '==', null).get();
  const now = Date.now();

  const dueMatches = pendingSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((m) => new Date(m.kickoffAt).getTime() + RESULT_DELAY_MS <= now);

  if (dueMatches.length === 0) {
    console.log('[check-results] Sonucu beklenen (3 saati geçmiş) maç yok. Çıkılıyor.');
    return;
  }
  console.log(`[check-results] ${dueMatches.length} maç sonuç bekliyor.`);

  // API isteklerini azaltmak için maçları tarihe göre grupla (günde 1 istek)
  const byDate = new Map();
  for (const match of dueMatches) {
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
        console.log(`[check-results] Eşleşme bulunamadı: ${match.homeTeam} vs ${match.awayTeam} (${date})`);
        continue;
      }
      const result = extractResult(fixture);
      if (!result) {
        console.log(`[check-results] Maç henüz bitmemiş: ${match.homeTeam} vs ${match.awayTeam}`);
        continue;
      }

      // Sonucu maça yaz
      await db.collection('matches').doc(match.id).update({ result });

      // Bu maça ait tüm tahminleri değerlendir
      const predSnap = await db.collection('predictions').where('matchId', '==', match.id).get();
      const affectedUserIds = new Set();
      for (const predDoc of predSnap.docs) {
        const data = predDoc.data();
        const isCorrect = data.choice === result;
        affectedUserIds.add(data.userId);
        await predDoc.ref.update({ isCorrect });
      }

      // Etkilenen her kullanıcının serisini yeniden hesapla
      for (const uid of affectedUserIds) {
        await recalculateUserStreak(uid);
      }

      updatedCount += 1;
      console.log(
        `[check-results] Sonuç yazıldı: ${match.homeTeam} ${result} ${match.awayTeam} (${predSnap.size} tahmin güncellendi)`,
      );
    }
  }

  console.log(`[check-results] Tamamlandı. ${updatedCount} maç güncellendi.`);
}

main().catch((err) => {
  console.error('[check-results] Beklenmeyen hata:', err);
  process.exit(1);
});
