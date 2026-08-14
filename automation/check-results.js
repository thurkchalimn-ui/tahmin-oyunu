// ============================================================================
// Bu script GitHub Actions tarafından zamanlanmış olarak (cron-job.org
// tetiklemesiyle, güvenilir şekilde) çalışır. Dört işi vardır:
//   1) Admin panelinden ELLE girilen sonuçlar için bekleyen bildirimleri gönderir
//      (notificationQueue koleksiyonu).
//   2) Maç başlamadan 30 dakika önce hatırlatma bildirimi gönderir.
//   3) [OPSİYONEL - FOOTBALL_DATA_KEY tanımlıysa] Başlamış ama sonucu admin tarafından
//      henüz girilmemiş maçlar için ANLIK SKORU (canlı skor) çeker ve Firestore'a
//      yazar - site bunu gerçek zamanlı okuyup gösterir.
//   4) Haftalık/aylık liderlik tablosunu hesaplayıp `leaderboardCache` koleksiyonuna
//      yazar (her ~6 saatlik çalışmada BİR KEZ - iteration 1'de). Site, bu ağır
//      hesaplamayı her sayfa açılışında tekrar yapmak yerine sadece bu hazır,
//      küçük dokümanı okur - Firestore okuma kotasını ciddi şekilde azaltır.
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
//   FOOTBALL_DATA_KEY                  -> OPSİYONEL. Sadece canlı skor istiyorsan gerekir.
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const REMINDER_WINDOW_MS = 30 * 60 * 1000; // Maç başlamadan 30 dakika önce hatırlatma gönder
// football-data.org'un ücretsiz planı dakikada 10 istek veriyor (API-Football'un
// günde 100 istek sınırından çok daha cömert) - bu yüzden her turda (5 dakikada
// bir) kontrol etmek güvenli.
const LIVE_SCORE_FETCH_INTERVAL_MS = 5 * 60 * 1000;
let lastLiveScoreFetchAt = 0;
// Kilit, döngünün her turunda (5 dakikada bir) tazelenir; TTL'i döngü
// aralığından biraz büyük tutuyoruz ki küçük gecikmeler kilidi düşürmesin.
const LOCK_TTL_MS = 7 * 60 * 1000;

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

/**
 * Aynı anda iki çalışmanın (ör. cron-job.org'un bir isteği tekrarlaması ya da
 * elle "Run workflow" ile otomatik tetiklemenin çakışması) aynı bildirimleri
 * İKİ KEZ göndermesini önlemek için basit bir kilit. `automationState/lock`
 * dokümanını bir transaction içinde okuyup-yazarak, hâlâ "taze" (LOCK_TTL_MS'den
 * yeni) bir kilit varsa bu çalışmayı hemen sonlandırır.
 */
// Bu çalıştırmaya özel benzersiz bir kimlik - kilidin GERÇEKTEN bu süreç
// tarafından tutulduğunu doğrulamak için kullanılır. Bu olmadan, kilit
// süresi (TTL) bir şekilde dolup başka bir süreç kilidi devraldığında, eski
// süreç bunu fark etmeden kilidi "tazeleyerek" üzerine yazabiliyordu - bu da
// iki sürecin aynı anda çalışıp AYNI bildirimi iki kez göndermesine yol açan
// olası bir yarış durumuydu.
const INSTANCE_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function acquireLockOrExit() {
  const lockRef = db.collection('automationState').doc('lock');
  const acquired = await db.runTransaction(async (tx) => {
    const snap = await tx.get(lockRef);
    const now = Date.now();
    const lockedAt = snap.exists ? snap.data().lockedAt : 0;
    if (snap.exists && now - lockedAt < LOCK_TTL_MS) {
      return false; // Başka bir çalışma hâlâ devam ediyor (ya da az önce bitti)
    }
    tx.set(lockRef, { lockedAt: now, lockedBy: INSTANCE_ID });
    return true;
  });

  if (!acquired) {
    console.log('[check-results] Başka bir çalışma zaten devam ediyor gibi görünüyor, bu çalışma atlanıyor.');
    process.exit(0);
  }
}

/**
 * Kilidi tazeler - ama SADECE hâlâ bu sürecin (INSTANCE_ID) sahip olduğunu
 * doğruladıktan sonra. Eğer kilit bir şekilde başka bir sürece geçmişse
 * (ör. bu süreç normalden uzun süren bir tur yüzünden TTL'i aştıysa), bu
 * süreç artık gerçek sahibi olmadığını fark edip kendini düzgünce sonlandırır
 * - böylece iki sürecin aynı anda çalışıp çift bildirim göndermesi önlenir.
 */
async function refreshLock() {
  const lockRef = db.collection('automationState').doc('lock');
  const stillOwner = await db.runTransaction(async (tx) => {
    const snap = await tx.get(lockRef);
    if (snap.exists && snap.data().lockedBy && snap.data().lockedBy !== INSTANCE_ID) {
      return false; // Kilit artık bize ait değil - başka bir süreç devralmış
    }
    tx.set(lockRef, { lockedAt: Date.now(), lockedBy: INSTANCE_ID });
    return true;
  });

  if (!stillOwner) {
    console.log('[check-results] Kilit başka bir çalışmaya geçmiş, bu çalışma güvenlik için kendini sonlandırıyor.');
    process.exit(0);
  }
}

// FOOTBALL_DATA_KEY opsiyonel: tanımlı değilse canlı skor adımı sessizce atlanır,
// bildirim/hatırlatma işlevleri bundan tamamen bağımsız çalışmaya devam eder.
// Bu anahtar football-data.org'dan alınır (dashboard.football-data.org/register)
// - ücretsiz, kredi kartsız, dakikada 10 istek. NOT: Ücretsiz plan sadece
// Premier Lig, Şampiyonlar Ligi, La Liga, Bundesliga, Serie A, Ligue 1 gibi
// büyük ligleri kapsar - küçük/alt ligler için canlı skor gelmez.
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;
if (!FOOTBALL_DATA_KEY) {
  console.warn('[check-results] UYARI: FOOTBALL_DATA_KEY tanımlı değil - canlı skor adımı atlanacak.');
}

/**
 * Verilen kullanıcı ID'lerine push bildirimi gönderir. Her kullanıcının
 * kayıtlı FCM token'larını (bkz. src/services/notificationService.ts,
 * users/{uid}.fcmTokens alanı) okuyup hepsine gönderir. Token artık geçersizse
 * (kullanıcı bildirimleri kapattıysa/uygulamayı kaldırdıysa) sessizce atlanır.
 */
// Aynı script çalıştırması içinde (ör. hem hatırlatma hem kuyruk işleme aynı
// kullanıcıyı etkiliyorsa) aynı kullanıcı dokümanının birden fazla kez
// okunmasını önlemek için basit bir önbellek. Firestore'un ücretsiz günlük
// okuma kotasını gereksiz yere tüketmemek için önemlidir.
const userDocCache = new Map();

/** Kullanıcının token'larını VE bildirim tercihlerini getirir (önbellekli). */
async function getUserNotifyInfo(uid) {
  if (userDocCache.has(uid)) return userDocCache.get(uid);
  const userSnap = await db.collection('users').doc(uid).get();
  const data = userSnap.data() ?? {};
  const info = {
    tokens: data.fcmTokens ?? [],
    notifyOnResult: data.notifyOnResult !== false, // belirtilmemişse varsayılan true
    notifyOnReminder: data.notifyOnReminder !== false,
  };
  userDocCache.set(uid, info);
  return info;
}

/**
 * Verilen kullanıcı ID'lerine push bildirimi gönderir. `type` parametresi
 * ('result' | 'reminder'), kullanıcının o türü kapatıp kapatmadığını kontrol
 * etmek için kullanılır - kapattıysa o kullanıcıya sessizce gönderilmez.
 */
async function sendPushToUsers(userIds, title, body, type) {
  for (const uid of userIds) {
    try {
      const info = await getUserNotifyInfo(uid);
      const wantsThisType = type === 'reminder' ? info.notifyOnReminder : info.notifyOnResult;
      if (!wantsThisType) continue;
      if (info.tokens.length === 0) continue;

      const response = await messaging.sendEachForMulticast({
        tokens: info.tokens,
        // ÖNEMLİ: `notification` alanı YERİNE bilinçli olarak `data` kullanılıyor.
        // `notification` alanı gönderilirse, tarayıcı bunu OTOMATİK olarak
        // gösteriyor - service worker'ımızdaki (onBackgroundMessage) elle
        // gösterim koduyla birleşince, AYNI mesaj için 2 bildirim çıkıyordu.
        // `data` kullanınca gösterim TAMAMEN service worker'ın kontrolünde
        // olur, otomatik/elle çakışması ortadan kalkar.
        data: { title, body },
      });

      // TEŞHİS AMAÇLI: FCM'in HER token için gerçekte ne döndürdüğünü (başarı
      // ya da tam hata kodu/mesajı) açıkça logla - "Kuyruktaki X bildirim
      // işlendi" mesajı sadece "kuyruk kaydı işlendi" anlamına geliyordu,
      // FCM'in mesajı gerçekten cihaza ulaştırıp ulaştırmadığını GÖSTERMİYORDU.
      response.responses.forEach((r, i) => {
        if (r.success) {
          console.log(`[check-results]   ✓ FCM başarılı - uid=${uid}, token=...${info.tokens[i].slice(-12)}`);
        } else {
          console.error(
            `[check-results]   ✗ FCM HATASI - uid=${uid}, token=...${info.tokens[i].slice(-12)}: ` +
              `${r.error?.code ?? 'bilinmeyen kod'} - ${r.error?.message ?? 'mesaj yok'}`,
          );
        }
      });

      const invalidTokens = response.responses
        .map((r, i) => (!r.success ? info.tokens[i] : null))
        .filter(Boolean);
      if (invalidTokens.length > 0) {
        const validTokens = info.tokens.filter((t) => !invalidTokens.includes(t));
        await db.collection('users').doc(uid).update({ fcmTokens: validTokens });
        userDocCache.set(uid, { ...info, tokens: validTokens }); // önbelleği de güncelle
      }
    } catch (err) {
      console.error(`[check-results] Bildirim gönderilemedi (${uid}):`, err.message);
    }
  }
}

/**
 * Admin panelinden elle sonuç girildiğinde `notificationQueue` koleksiyonuna
 * bırakılan bekleyen bildirimleri okuyup gönderir, sonra siler.
 *
 * ÖNEMLİ SIRA: Kuyruk kaydı ÖNCE silinir, bildirim SONRA gönderilir (tam
 * tersi değil). Böylece script gönderim sırasında bir hataya (ör. kota
 * dolması) çarparsa, kayıt zaten silinmiş olduğu için bir sonraki turda
 * tekrar gönderilip ÇİFT bildirime yol açmaz - en kötü ihtimalle o tek
 * bildirim hiç gitmemiş olur, bu iki kez gitmesinden çok daha az rahatsız edici.
 */
async function processNotificationQueue() {
  const snap = await db.collection('notificationQueue').get();
  if (snap.empty) return;

  let sentCount = 0;
  for (const queueDoc of snap.docs) {
    const { userId, title, body } = queueDoc.data();
    await queueDoc.ref.delete();
    if (userId && title) {
      await sendPushToUsers([userId], title, body ?? '', 'result');
      sentCount += 1;
    }
  }
  console.log(`[check-results] Kuyruktaki ${sentCount} bildirim işlendi.`);
}

// --- Canlı skor yardımcı fonksiyonları (sadece FOOTBALL_DATA_KEY varsa kullanılır) ---

/** Takım adlarını karşılaştırılabilir hale getirir (küçük harf, boşluk/aksan temizliği). */
function normalizeTeamName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** football-data.org'dan verilen tarihe ait maçları çeker. */
async function fetchFixturesForDate(date) {
  const res = await fetch(`https://api.football-data.org/v4/matches?dateFrom=${date}&dateTo=${date}`, {
    headers: {
      'X-Auth-Token': FOOTBALL_DATA_KEY,
    },
  });
  if (!res.ok) throw new Error(`football-data.org isteği başarısız: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.matches ?? [];
}

/** Bizim kayıtlı maçımızı, API'den gelen fikstür listesinden takım adına göre bulur. */
/**
 * Bizim kayıtlı maçımızı, API'den gelen fikstür listesinden takım adına göre bulur.
 * Önce TAM eşleşme dener (ör. "besiktas" === "besiktas"). Bulamazsa, biri
 * diğerini İÇERİYOR mu diye bakar (ör. "besiktas" ile "besiktasjk" - API'nin
 * takım isimlerine "FC", "JK", "1879" gibi ekler eklemesi çok yaygındır ve tam
 * eşleşmeyi engeller). Bu ikinci adım, admin panelindeki kısa/sade isimlerle
 * API'nin resmi (uzun) isimleri arasındaki farkların çoğunu çözer.
 */
function findMatchingFixture(match, fixtures) {
  const home = normalizeTeamName(match.homeTeam);
  const away = normalizeTeamName(match.awayTeam);

  const exact = fixtures.find((f) => {
    const fHome = normalizeTeamName(f.homeTeam?.name ?? '');
    const fAway = normalizeTeamName(f.awayTeam?.name ?? '');
    return fHome === home && fAway === away;
  });
  if (exact) return exact;

  return fixtures.find((f) => {
    const fHome = normalizeTeamName(f.homeTeam?.name ?? '');
    const fAway = normalizeTeamName(f.awayTeam?.name ?? '');
    const homeMatches = fHome.length > 2 && home.length > 2 && (fHome.includes(home) || home.includes(fHome));
    const awayMatches = fAway.length > 2 && away.length > 2 && (fAway.includes(away) || away.includes(fAway));
    return homeMatches && awayMatches;
  });
}

/**
 * Eşleşme bulunamadığında, API'deki fikstür listesi içinde adı en çok benzeyen
 * takımları bulup önerir (ilk 4 harfi aynı olanlar). Sadece teşhis/loglama
 * amaçlıdır - admin panelindeki yazımı API'nin kullandığı resmi isimle
 * düzeltmek için hangi ismin doğru olduğunu görmeyi sağlar.
 */
function suggestCandidateNames(teamName, fixtures) {
  const key = normalizeTeamName(teamName).slice(0, 4);
  if (key.length < 3) return [];
  const names = new Set();
  fixtures.forEach((f) => {
    const h = f.homeTeam?.name ?? '';
    const a = f.awayTeam?.name ?? '';
    if (normalizeTeamName(h).startsWith(key)) names.add(h);
    if (normalizeTeamName(a).startsWith(key)) names.add(a);
  });
  return [...names];
}

/**
 * football-data.org'dan gelen maçtan anlık skor bilgisini çıkarır. Maç henüz
 * başlamamışsa (SCHEDULED/TIMED) null döner. NOT: football-data.org, dakika
 * bilgisini (kaçıncı dakikada olunduğunu) API-Football kadar güvenilir
 * vermiyor - bu yüzden sadece durum (status) gösterilir, dakika genelde boş kalır.
 */
function extractLiveScore(fixture) {
  const status = fixture.status;
  if (!status || status === 'SCHEDULED' || status === 'TIMED') return null;

  const homeGoals = fixture.score?.fullTime?.home ?? fixture.score?.halfTime?.home ?? 0;
  const awayGoals = fixture.score?.fullTime?.away ?? fixture.score?.halfTime?.away ?? 0;

  return {
    homeGoals: homeGoals ?? 0,
    awayGoals: awayGoals ?? 0,
    status,
    minute: null,
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
        const homeCandidates = suggestCandidateNames(match.homeTeam, fixtures);
        const awayCandidates = suggestCandidateNames(match.awayTeam, fixtures);
        console.log(
          `[check-results] Eşleşme bulunamadı: ${match.homeTeam} vs ${match.awayTeam} (${date}) - ${fixtures.length} maç içinden hiçbiri isim olarak eşleşmedi.`,
        );
        if (homeCandidates.length > 0) {
          console.log(`  → "${match.homeTeam}" için API'deki olası isimler: ${homeCandidates.join(', ')}`);
        }
        if (awayCandidates.length > 0) {
          console.log(`  → "${match.awayTeam}" için API'deki olası isimler: ${awayCandidates.join(', ')}`);
        }
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

/** Tek bir kontrol turunu çalıştırır: bildirim kuyruğu + hatırlatma + canlı skor. */
async function runOnce() {
  console.log('[check-results] Tur başlıyor:', new Date().toISOString());

  const now = Date.now();

  // --- Yoğun saat kontrolü: bugün/dün için maçlardan birinin [kickoff-1sa,
  // kickoff+4sa] penceresinde değilsek, bu turda HİÇBİR ağır iş yapılmaz
  // (bildirim kuyruğu dahil) - gece yarısı gibi saatlerde gereksiz Firestore
  // sorgusu/API çağrısı yapılmasın diye.
  if (!(await isWithinMatchHours(now))) {
    console.log('[check-results] Yoğun saatler dışında - bu tur tamamen atlandı.');
    console.log('[check-results] Tur tamamlandı.');
    return;
  }

  // --- 1) Admin panelinden elle girilen sonuçlara ait bekleyen bildirimler ---
  await processNotificationQueue();

  // ÖNEMLİ: Sorgu `kickoffAt` (tam saat) üzerinden şu aralıkla sınırlıdır:
  //  - Alt sınır (bugünün başlangıcı, 00:00): dünden önceki maçlar zaten
  //    admin tarafından günü gününe sonuçlandırılmış olmalı; otomasyonun
  //    onları bir daha okumasına gerek yok - bu, "unutulmuş eski maç"
  //    birikmesini tamamen ortadan kaldırır.
  //  - Üst sınır (şu an + 30 dakika = hatırlatma penceresi): henüz yaklaşmamış
  //    (30 dakikadan uzun süre sonra başlayacak) maçlar sorguya hiç dahil
  //    edilmez - onlara zaten hiçbir işlem yapılmıyor, sadece kota tüketiyorlardı.
  // "Bugünün başlangıcı" Türkiye saatine (UTC+3) göre hesaplanır - GitHub Actions
  // runner'ları UTC'de çalıştığı için, bu düzeltme yapılmazsa gece yarısına yakın
  // (ör. Türkiye saatiyle 00:30) başlayan maçlar yanlışlıkla "dünün maçı" sayılıp
  // sorgudan dışlanabilirdi.
  const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
  const trNow = new Date(now + TR_OFFSET_MS);
  const trMidnightUtc = Date.UTC(trNow.getUTCFullYear(), trNow.getUTCMonth(), trNow.getUTCDate(), 0, 0, 0);
  const startOfTodayIso = new Date(trMidnightUtc - TR_OFFSET_MS).toISOString();
  const horizonIso = new Date(now + REMINDER_WINDOW_MS).toISOString();
  const pendingSnap = await db
    .collection('matches')
    .where('result', '==', null)
    .where('kickoffAt', '>=', startOfTodayIso)
    .where('kickoffAt', '<=', horizonIso)
    .get();
  const allPending = pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // --- 2) Maç başlamadan 30 dakika önce hatırlatma bildirimi ---
  const upcomingMatches = allPending.filter((m) => {
    if (m.reminderSent) return false;
    const msUntilKickoff = new Date(m.kickoffAt).getTime() - now;
    return msUntilKickoff > 0 && msUntilKickoff <= REMINDER_WINDOW_MS;
  });

  // Tahmin yapmamış kullanıcılara da hatırlatma gönderebilmek için, bu turda
  // en az bir maç hatırlatma penceresindeyse TÜM kullanıcı ID'lerini bir kez
  // çekiyoruz (her maç için ayrı ayrı değil - kota dostu olması için).
  let allUserIds = null;
  if (upcomingMatches.length > 0) {
    const allUsersSnap = await db.collection('users').get();
    allUserIds = allUsersSnap.docs.map((d) => d.id);
  }

  for (const match of upcomingMatches) {
    const predSnap = await db.collection('predictions').where('matchId', '==', match.id).get();
    const predictedUserIds = new Set(predSnap.docs.map((d) => d.data().userId));

    if (predictedUserIds.size > 0) {
      await sendPushToUsers(
        [...predictedUserIds],
        '⏰ Maç Yakında Başlıyor',
        `${match.homeTeam} vs ${match.awayTeam} 30 dakika içinde başlıyor!`,
        'reminder',
      );
      console.log(`[check-results] Hatırlatma gönderildi: ${match.homeTeam} vs ${match.awayTeam} (${predictedUserIds.size} kullanıcı - tahmin etmiş)`);
    }

    // YENİ: Bu maça HENÜZ tahmin yapmamış diğer tüm kullanıcılara da ayrı bir
    // hatırlatma gönder - "tahminini unutma" şeklinde.
    const unpredictedUserIds = (allUserIds ?? []).filter((uid) => !predictedUserIds.has(uid));
    if (unpredictedUserIds.length > 0) {
      await sendPushToUsers(
        unpredictedUserIds,
        '⏰ Tahminini Unutma!',
        `${match.homeTeam} vs ${match.awayTeam} 30 dakika içinde başlıyor - henüz tahmin yapmadın!`,
        'reminder',
      );
      console.log(`[check-results] Hatırlatma gönderildi: ${match.homeTeam} vs ${match.awayTeam} (${unpredictedUserIds.length} kullanıcı - tahmin etmemiş)`);
    }

    // Her iki grup da (varsa) bilgilendirildiği için maçı işaretle. Hiç
    // kullanıcı yoksa (predictedUserIds VE unpredictedUserIds boşsa - ör.
    // henüz hiç kayıtlı kullanıcı yoksa) işaretlemeden geç, bir sonraki turda
    // tekrar denensin.
    if (predictedUserIds.size > 0 || unpredictedUserIds.length > 0) {
      await db.collection('matches').doc(match.id).update({ reminderSent: true });
    } else {
      console.log(`[check-results] Bildirilecek kimse yok, hatırlatma ertelendi: ${match.homeTeam} vs ${match.awayTeam}`);
    }
  }

  // --- 3) Canlı skor güncelleme (sadece FOOTBALL_DATA_KEY tanımlıysa) ---
  // CANLI SKOR ÖZELLİĞİ İPTAL EDİLDİ (kullanıcı isteğiyle) - artık maçlar
  // sadece admin panelinden elle sonuçlandırılıyor, football-data.org'a hiç
  // istek atılmıyor. Fonksiyonun kendisi (updateLiveScores) silinmedi,
  // sadece çağrısı kapatıldı - ileride tekrar istenirse bu bloğu geri açmak
  // yeterli olur.
  // if (FOOTBALL_DATA_KEY && now - lastLiveScoreFetchAt >= LIVE_SCORE_FETCH_INTERVAL_MS) {
  //   lastLiveScoreFetchAt = now;
  //   await updateLiveScores(allPending, now);
  // }

  console.log('[check-results] Tur tamamlandı.');
}

// --- Haftalık/aylık liderlik önbellekleme (site burada değil, sadece bu önbelleği okur) ---

/** İçinde bulunulan haftanın Pazartesi'sini 'YYYY-MM-DD' olarak döner. */
function startOfWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

/** Bir sonraki Pazartesi'yi 'YYYY-MM-DD' olarak döner (üst sınır - dahil değil). */
function endOfWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() - diffToMonday + 7);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday.toISOString().slice(0, 10);
}

function startOfMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function endOfMonthKey() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().slice(0, 10);
}

/**
 * Bugünün ay anahtarını ("2026-08" gibi) hesaplar. Aylık liderlik önbelleği
 * artık TEK bir "month" dokümanına yazılıp her ay üzerine yazılmıyor - her
 * ay kendi anahtarıyla AYRI bir dokümana yazılıyor (ör. leaderboardCache/month_2026-08)
 * - bu sayede geçmiş aylar SİLİNMEDEN kalıcı olarak saklanır (ödül verme
 * amacıyla geçmiş aylara bakılabilsin diye, bkz. src/services/periodLeaderboardService.ts).
 */
function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** userService.ts / xpUtils.ts ile BİREBİR AYNI eşikler ve formül. */
const MATCH_STREAK_MILESTONES = [3, 5, 10, 15, 20, 30, 50, 100];
const ACTIVITY_STREAK_MILESTONES = [3, 7, 15, 30, 60, 100, 365];
const CORRECT_TOTAL_MILESTONES = [50, 100, 250, 500, 1000, 2500, 5000];
const FOLLOWER_COUNT_MILESTONES = [5, 10, 25, 50, 100, 250, 500];

// Oyunun adı "Tahmin Serisi" - seri, oyunun kalbi. Bu yüzden seri rozetleri
// (matchStreak) diğerleri gibi sabit +50 XP yerine, ulaşılan eşikle
// orantılı XP veriyor (eşik × 10) - bkz. src/utils/xpUtils.ts (birebir aynı mantık).
function calculateXP({ correctPredictions, totalPredictions, badges, activityStreak, followerCount, inviteCount, socialFollowCount }) {
  const wrongPredictions = Math.max(0, totalPredictions - correctPredictions);
  const badgeXP = badges.reduce((sum, b) => sum + (b.type === 'matchStreak' ? b.value * 10 : 50), 0);
  return (
    correctPredictions * 10 +
    wrongPredictions * 2 +
    badgeXP +
    activityStreak * 5 +
    followerCount * 5 +
    inviteCount * 50 +
    socialFollowCount * 25
  );
}

/**
 * TÜM kullanıcıların XP'sini yeniden hesaplayıp yazar - özellikle TAKİPÇİ
 * SAYISINDAKİ değişiklikleri yansıtmak için gereklidir. İstemci (tarayıcı),
 * güvenlik kuralı gereği başkasının profiline yazamadığı için (bir kullanıcı
 * birini takip ettiğinde, takip edilenin XP'si ANINDA güncellenemiyor) - bu
 * güncelleme Admin SDK yetkisine sahip bu script tarafından, kurallara
 * takılmadan, periyodik olarak yapılır. Ayrıca eksik kalan rozetleri de
 * (eşikler genişletildiğinde geriye dönük olarak) otomatik tamamlar - bkz.
 * backfill-badges.js ile aynı mantık, ama artık her ~6 saatte bir otomatik
 * çalışır, elle çalıştırmaya gerek kalmaz.
 */
async function recalculateAllUsersXP() {
  const usersSnap = await db.collection('users').get();
  let updated = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const badges = Array.isArray(data.badges) ? [...data.badges] : [];
    const bestStreak = data.bestStreak ?? 0;
    const activityStreak = data.activityStreak ?? 0;
    const correctPredictions = data.correctPredictions ?? 0;
    const totalPredictions = data.totalPredictions ?? 0;

    // Eksik kalan rozetleri geriye dönük tamamla (eşik genişletildiğinde)
    const nowIso = new Date().toISOString();
    for (const milestone of MATCH_STREAK_MILESTONES) {
      if (!badges.some((b) => b.type === 'matchStreak' && b.value === milestone) && bestStreak >= milestone) {
        badges.push({ type: 'matchStreak', value: milestone, achievedAt: nowIso });
      }
    }
    for (const milestone of ACTIVITY_STREAK_MILESTONES) {
      if (!badges.some((b) => b.type === 'activityStreak' && b.value === milestone) && activityStreak >= milestone) {
        badges.push({ type: 'activityStreak', value: milestone, achievedAt: nowIso });
      }
    }
    for (const milestone of CORRECT_TOTAL_MILESTONES) {
      if (!badges.some((b) => b.type === 'correctTotal' && b.value === milestone) && correctPredictions >= milestone) {
        badges.push({ type: 'correctTotal', value: milestone, achievedAt: nowIso });
      }
    }

    const followerCountSnap = await db.collection('follows').where('followedUid', '==', userDoc.id).count().get();
    const followerCount = followerCountSnap.data().count;

    for (const milestone of FOLLOWER_COUNT_MILESTONES) {
      if (!badges.some((b) => b.type === 'followerCount' && b.value === milestone) && followerCount >= milestone) {
        badges.push({ type: 'followerCount', value: milestone, achievedAt: nowIso });
      }
    }

    const inviteCountSnap = await db.collection('users').where('invitedByUid', '==', userDoc.id).count().get();
    const inviteCount = inviteCountSnap.data().count;

    const socialFollowClaimed = data.socialFollowClaimed || {};
    const socialFollowCount = Object.values(socialFollowClaimed).filter(Boolean).length;

    const xp = calculateXP({ correctPredictions, totalPredictions, badges, activityStreak, followerCount, inviteCount, socialFollowCount });

    if (xp !== (data.xp ?? 0) || badges.length !== (Array.isArray(data.badges) ? data.badges.length : 0)) {
      await userDoc.ref.update({ xp, badges });
      updated += 1;
    }
  }

  console.log(`[check-results] Kullanıcı XP/rozet güncellemesi: ${updated} kullanıcı güncellendi.`);
}

/**
 * Bugün için "yoğun saatler" penceresini hesaplar: ilk maçın başlama
 * saatinden 1 saat öncesi, son maçın başlama saatinden 4 saat sonrasına
 * kadar (maçın ortalama süresi ~2 saat + maç bittikten sonra istenen 2
 * saatlik tampon = toplam 4 saat). Bu pencerenin DIŞINDA hiçbir ağır iş
 * (bildirim kuyruğu işleme, hatırlatma taraması, canlı skor çekme) yapılmaz -
 * gece yarısı gibi saatlerde Firestore'a gereksiz sorgu atılmasın diye.
 */
async function isWithinMatchHours(now) {
  // ÖNEMLİ (DÜZELTME): "Bugün" Türkiye saatine (UTC+3) göre hesaplanmalı -
  // ham UTC tarihi kullanmak, akşam/gece maçlarında (TR saatiyle günün geç
  // saatlerinde ama UTC henüz bir önceki günde olabilir) YANLIŞ güne
  // bakılmasına yol açıyordu - bu da "bugün hiç maç yok" sanılıp tüm
  // bildirimlerin (hatırlatma + sonuç) sessizce atlanmasına neden oluyordu.
  // runOnce()'daki startOfTodayIso hesaplamasıyla AYNI mantık kullanılıyor.
  const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
  const trNow = new Date(now + TR_OFFSET_MS);
  const todayKey = `${trNow.getUTCFullYear()}-${String(trNow.getUTCMonth() + 1).padStart(2, '0')}-${String(trNow.getUTCDate()).padStart(2, '0')}`;
  const trYesterday = new Date(now + TR_OFFSET_MS - 24 * 60 * 60 * 1000);
  // Dünün tarihi de kontrol edilir - gece yarısına yakın (ör. 23:00) başlayan
  // bir maç, "bugün" sorgusunda hiç görünmez ama hâlâ 4 saatlik penceresinde
  // olabilir (ör. saat 00:30'dayız). Bu sınır durumunu kaçırmamak için.
  const yesterdayKey = `${trYesterday.getUTCFullYear()}-${String(trYesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(trYesterday.getUTCDate()).padStart(2, '0')}`;

  const snap = await db.collection('matches').where('date', 'in', [yesterdayKey, todayKey]).get();
  if (snap.empty) {
    console.log(`[check-results] isWithinMatchHours: ${yesterdayKey}/${todayKey} için hiç maç bulunamadı.`);
    return false;
  }

  const kickoffTimes = snap.docs
    .map((d) => {
      const kickoffAt = d.data().kickoffAt;
      const date = kickoffAt?.toDate ? kickoffAt.toDate() : new Date(kickoffAt);
      return date.getTime();
    })
    .filter((t) => !Number.isNaN(t));
  if (kickoffTimes.length === 0) return false;

  // ÖNEMLİ: min/max ile TEK bir geniş pencere hesaplamak yerine (bu, dün
  // 10:00'daki bir maçla bugün 22:00'daki bir maçı yanlışlıkla 36 saatlik
  // TEK bir pencereye birleştirirdi), HER maç kendi [kickoff-1sa, kickoff+4sa]
  // penceresiyle AYRI AYRI kontrol edilir - şu an herhangi BİRİNİN
  // penceresindeysek yeterlidir.
  const result = kickoffTimes.some((t) => now >= t - 60 * 60 * 1000 && now <= t + 240 * 60 * 1000);
  console.log(
    `[check-results] isWithinMatchHours: ${kickoffTimes.length} maç bulundu (${yesterdayKey}/${todayKey}), sonuç=${result}`,
  );
  return result;
}

/**
 * Verilen dönem (hafta/ay) için liderlik tablosunu hesaplayıp `leaderboardCache/{period}`
 * dokümanına yazar. Site bu ağır hesaplamayı KENDİSİ yapmaz - sadece bu hazır
 * dokümanı okur. Bu, günlük Firestore okuma kotasını ciddi şekilde azaltır çünkü
 * her kullanıcının her sayfa açılışında tekrarladığı pahalı sorgular yerine, bu
 * hesaplama günde birkaç kez (her ~6 saatte bir) SADECE BİR KEZ yapılır.
 */
async function cachePeriodLeaderboard(period) {
  const start = period === 'week' ? startOfWeekKey() : startOfMonthKey();
  const end = period === 'week' ? endOfWeekKey() : endOfMonthKey();
  // ÖNEMLİ: 'week' için hep aynı dokümana ('week') yazılır (geçici, sadece
  // güncel hafta). 'month' için ise HER AY kendi anahtarına yazılır (ör.
  // 'month_2026-08') - böylece geçmiş aylar bir sonraki ayda ÜZERİNE
  // YAZILMAZ, kalıcı olarak saklanır.
  const docId = period === 'week' ? 'week' : `month_${currentMonthKey()}`;

  const matchesSnap = await db.collection('matches').where('date', '>=', start).where('date', '<', end).get();
  const matchIds = matchesSnap.docs.map((d) => d.id);

  if (matchIds.length === 0) {
    await db.collection('leaderboardCache').doc(docId).set({ entries: [], computedAt: Date.now() });
    console.log(`[check-results] ${docId} liderlik önbelleği güncellendi (0 maç, boş).`);
    return;
  }

  const statsByUser = new Map();
  for (let i = 0; i < matchIds.length; i += 30) {
    const chunk = matchIds.slice(i, i + 30);
    const predSnap = await db.collection('predictions').where('matchId', 'in', chunk).get();
    predSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.isCorrect !== true && data.isCorrect !== false) return;
      const uid = data.userId;
      const entry = statsByUser.get(uid) ?? { total: 0, correct: 0 };
      entry.total += 1;
      if (data.isCorrect === true) entry.correct += 1;
      statsByUser.set(uid, entry);
    });
  }

  const uids = [...statsByUser.keys()];
  const entries = [];
  for (let i = 0; i < uids.length; i += 30) {
    const chunk = uids.slice(i, i + 30);
    const snap = await db.collection('users').where(FieldPath.documentId(), 'in', chunk).get();
    snap.docs.forEach((d) => {
      const stats = statsByUser.get(d.id);
      if (!stats) return;
      const data = d.data();
      entries.push({
        uid: d.id,
        displayName: data.displayName ?? 'İsimsiz Oyuncu',
        avatarUrl: data.avatarUrl ?? null,
        badges: data.badges ?? [],
        totalPredictions: stats.total,
        correctPredictions: stats.correct,
      });
    });
  }

  entries.sort((a, b) => {
    if (b.correctPredictions !== a.correctPredictions) return b.correctPredictions - a.correctPredictions;
    const accA = a.totalPredictions > 0 ? a.correctPredictions / a.totalPredictions : 0;
    const accB = b.totalPredictions > 0 ? b.correctPredictions / b.totalPredictions : 0;
    return accB - accA;
  });

  await db.collection('leaderboardCache').doc(docId).set({ entries, computedAt: Date.now() });
  console.log(`[check-results] ${docId} liderlik önbelleği güncellendi (${entries.length} kullanıcı).`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ana giriş noktası. Eskiden bu script her 5 dakikada bir GitHub Actions
 * tarafından SIFIRDAN başlatılıyordu (288 ayrı çalışma/gün). Şimdi TEK bir
 * çalışma başlıyor ve kendi içinde 5 dakikada bir `runOnce()`'u tekrarlayan
 * bir döngüye giriyor - GitHub'ın barındırılan runner'larda izin verdiği
 * maksimum 6 saatlik süreye kadar (güvenli pay için 5 saat 45 dakikada
 * kendiliğinden durur). cron-job.org'un artık her 5 dakikada değil, her
 * ~5.5-6 saatte bir tetiklemesi yeterlidir - bu hem ayrı çalışma başlatma
 * yükünü hem de "runner bekleme" gecikmesine maruz kalma sıklığını azaltır.
 */
const LOOP_INTERVAL_MS = 5 * 60 * 1000; // Tur arası bekleme: 5 dakika
const MAX_RUNTIME_MS = 5 * 60 * 60 * 1000 + 45 * 60 * 1000; // ~5 saat 45 dakika (6 saatlik sınırın altında güvenli pay)

/**
 * 'accepted' durumundaki düelloları tarar - eğer 5 maçın HEPSİ sonuçlanmışsa
 * (result != null), her iki oyuncunun bu 5 maçtaki doğru tahmin sayısını
 * sayar (predictions koleksiyonundan `${uid}_${matchId}` ID'siyle doğrudan
 * okuyarak - sorgu değil, hızlı doküman okuması), kazananı belirler,
 * düelloyu 'completed' yapar ve her iki oyuncuya sonuç bildirimi gönderir.
 * ÖNEMLİ: Bu, düellonun kazananını belirleyen TEK yer - istemci tarafında
 * hiçbir şekilde yazılamaz (bkz. firestore.rules).
 */
async function resolveDuels() {
  const pendingSnap = await db.collection('duels').where('status', '==', 'accepted').get();
  if (pendingSnap.empty) return;

  let resolvedCount = 0;

  for (const duelDoc of pendingSnap.docs) {
    const duel = duelDoc.data();
    const matchIds = duel.matchIds || [];
    if (matchIds.length !== 5) continue;

    const matchSnaps = await Promise.all(matchIds.map((id) => db.collection('matches').doc(id).get()));
    const allResolved = matchSnaps.every((s) => s.exists && s.data().result != null);
    if (!allResolved) continue;

    async function countCorrect(uid) {
      let correct = 0;
      for (const matchId of matchIds) {
        const predSnap = await db.collection('predictions').doc(`${uid}_${matchId}`).get();
        if (predSnap.exists && predSnap.data().isCorrect === true) correct += 1;
      }
      return correct;
    }

    const challengerScore = await countCorrect(duel.challengerUid);
    const opponentScore = await countCorrect(duel.opponentUid);
    const winnerUid =
      challengerScore > opponentScore ? duel.challengerUid : opponentScore > challengerScore ? duel.opponentUid : null;

    const nowIso = new Date().toISOString();
    await duelDoc.ref.update({
      status: 'completed',
      challengerScore,
      opponentScore,
      winnerUid,
      completedAt: nowIso,
    });

    const resultText =
      winnerUid === duel.challengerUid
        ? `${duel.challengerDisplayName} kazandı! (${challengerScore}-${opponentScore})`
        : winnerUid === duel.opponentUid
          ? `${duel.opponentDisplayName} kazandı! (${opponentScore}-${challengerScore})`
          : `Berabere bitti! (${challengerScore}-${opponentScore})`;

    for (const uid of [duel.challengerUid, duel.opponentUid]) {
      await db.collection('notifications').add({
        userId: uid,
        type: 'duel',
        title: '⚔️ Düello Sonuçlandı!',
        body: resultText,
        isRead: false,
        link: `/duello/${duelDoc.id}`,
        createdAt: new Date(),
      });
    }

    resolvedCount += 1;
  }

  console.log(`[check-results] Düello sonuçlandırma: ${resolvedCount} düello tamamlandı.`);
}

async function main() {
  await acquireLockOrExit();

  const startTime = Date.now();
  let turNo = 0;

  while (Date.now() - startTime < MAX_RUNTIME_MS) {
    turNo += 1;
    await refreshLock(); // Kilidi tazele - bu süre boyunca başka bir çalışma başlarsa hemen çıkar
    console.log(`[check-results] === Tur ${turNo} ===`);
    try {
      await runOnce();
    } catch (err) {
      console.error('[check-results] Bu turda beklenmeyen hata (döngü devam ediyor):', err);
    }

    // Haftalık/aylık liderlik önbelleğini SADECE bu çalışmanın ilk turunda
    // güncelle (yani her ~6 saatte bir kez) - her 5 dakikada bir yapmak
    // gereksiz yere pahalı olurdu, liderlik verisinin bu kadar taze olmasına
    // gerek yok.
    if (turNo === 1) {
      try {
        await recalculateAllUsersXP();
      } catch (err) {
        console.error('[check-results] Kullanıcı XP güncellemesi başarısız:', err);
      }
      try {
        await cachePeriodLeaderboard('week');
        await cachePeriodLeaderboard('month');
      } catch (err) {
        console.error('[check-results] Liderlik önbelleği güncellenemedi:', err);
      }
      try {
        await resolveDuels();
      } catch (err) {
        console.error('[check-results] Düello sonuçlandırma başarısız:', err);
      }
    }

    await sleep(LOOP_INTERVAL_MS);
  }

  console.log('[check-results] Maksimum çalışma süresine ulaşıldı, script düzgün şekilde sonlanıyor.');
}

main().catch((err) => {
  console.error('[check-results] Beklenmeyen hata:', err);
  process.exit(1);
});
