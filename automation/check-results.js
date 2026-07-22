// ============================================================================
// Bu script GitHub Actions tarafından zamanlanmış olarak (15 dakikada bir)
// çalıştırılır. İki işi vardır:
//   1) Başlamış ama henüz bitmemiş maçlar için ANLIK SKORU (canlı skor) çeker
//      ve Firestore'a yazar - site bunu gerçek zamanlı okuyup gösterir.
//   2) API-Football maçın bittiğini bildirdiği an (FT / AET / PEN) kesin
//      sonucu yazar, tahminleri değerlendirir, serileri günceller.
// Maçı API'de bulamazsa (takım adı eşleşmezse vb.) sessizce atlar; o maç admin
// panelinden elle girilmeye devam edilebilir.
//
// Gerekli ortam değişkenleri (GitHub Actions "Secrets" olarak eklenir):
//   FIREBASE_SERVICE_ACCOUNT_KEY  -> Firebase servis hesabı JSON'ının tamamı (tek satır)
//   API_FOOTBALL_KEY              -> dashboard.api-football.com üzerinden alınan
//                                    ücretsiz API anahtarı (RapidAPI KULLANILMIYOR)
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const STREAK_TARGET = 15;

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('HATA: FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}
const serviceAccount = JSON.parse(serviceAccountRaw);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
if (!API_FOOTBALL_KEY) {
  console.error('HATA: API_FOOTBALL_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}

function normalizeTeamName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

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

/** API-Football'dan (RapidAPI değil, doğrudan kendi sunucusundan) verilen tarihe ait tüm maçları çeker. */
async function fetchFixturesForDate(date) {
  const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
    headers: {
      'x-apisports-key': API_FOOTBALL_KEY,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '(gövde okunamadı)');
    throw new Error(
      `API-Football isteği başarısız: ${res.status} ${res.statusText} - Gövde: ${bodyText.slice(0, 500)}`,
    );
  }
  const json = await res.json();
  return json.response ?? [];
}

function findMatchingFixture(match, fixtures) {
  const home = normalizeTeamName(match.homeTeam);
  const away = normalizeTeamName(match.awayTeam);
  return fixtures.find((f) => {
    const fHome = normalizeTeamName(f.teams?.home?.name ?? '');
    const fAway = normalizeTeamName(f.teams?.away?.name ?? '');
    return fHome === home && fAway === away;
  });
}

function extractResult(fixture) {
  const status = fixture.fixture?.status?.short;
  const finishedStatuses = ['FT', 'AET', 'PEN'];
  if (!finishedStatuses.includes(status)) return null;

  const homeGoals = fixture.goals?.home;
  const awayGoals = fixture.goals?.away;
  if (homeGoals == null || awayGoals == null) return null;

  if (homeGoals > awayGoals) return 'HOME';
  if (homeGoals < awayGoals) return 'AWAY';
  return 'DRAW';
}

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

async function main() {
  console.log('[check-results] Kontrol başlıyor:', new Date().toISOString());

  const pendingSnap = await db.collection('matches').where('result', '==', null).get();
  const now = Date.now();

  const startedMatches = pendingSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((m) => new Date(m.kickoffAt).getTime() <= now);

  if (startedMatches.length === 0) {
    console.log('[check-results] Başlamış, sonucu bekleyen maç yok. Çıkılıyor.');
    return;
  }
  console.log(`[check-results] ${startedMatches.length} başlamış maç kontrol edilecek.`);

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

      const result = extractResult(fixture);

      if (result) {
        await db.collection('matches').doc(match.id).update({ result, liveScore: null });

        const predSnap = await db.collection('predictions').where('matchId', '==', match.id).get();
        const affectedUserIds = new Set();
        for (const predDoc of predSnap.docs) {
          const data = predDoc.data();
          const isCorrect = data.choice === result;
          affectedUserIds.add(data.userId);
          await predDoc.ref.update({ isCorrect });
        }
        for (const uid of affectedUserIds) {
          await recalculateUserStreak(uid);
        }

        finalizedCount += 1;
        console.log(
          `[check-results] Sonuç yazıldı: ${match.homeTeam} ${result} ${match.awayTeam} (${predSnap.size} tahmin güncellendi)`,
        );
        continue;
      }

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