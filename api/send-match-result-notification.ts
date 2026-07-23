import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
  return initializeApp({ credential: cert(serviceAccount) });
}

async function sendPushToUsers(
  db: FirebaseFirestore.Firestore,
  messaging: ReturnType<typeof getMessaging>,
  uids: string[],
  { title, body }: { title: string; body: string },
) {
  const uniqueUids = [...new Set(uids)];
  if (uniqueUids.length === 0) return;

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueUids.length; i += 30) chunks.push(uniqueUids.slice(i, i + 30));

  const tokenOwners: { uid: string; token: string }[] = [];
  await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await db.collection('users').where('__name__', 'in', chunk).get();
      snap.docs.forEach((d) => {
        const tokens = (d.data().fcmTokens as string[]) ?? [];
        tokens.forEach((token) => tokenOwners.push({ uid: d.id, token }));
      });
    }),
  );
  if (tokenOwners.length === 0) return;

  const tokenChunks: { uid: string; token: string }[][] = [];
  for (let i = 0; i < tokenOwners.length; i += 500) tokenChunks.push(tokenOwners.slice(i, i + 500));

  for (const tokenChunk of tokenChunks) {
    const tokens = tokenChunk.map((t) => t.token);
    const response = await messaging.sendEachForMulticast({ tokens, notification: { title, body } });

    const invalidTokensByUid = new Map<string, string[]>();
    response.responses.forEach((res, i) => {
      if (res.success) return;
      const code = res.error?.code;
      if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
        const { uid, token } = tokenChunk[i];
        if (!invalidTokensByUid.has(uid)) invalidTokensByUid.set(uid, []);
        invalidTokensByUid.get(uid)!.push(token);
      }
    });
    for (const [uid, invalidTokens] of invalidTokensByUid) {
      await db
        .collection('users')
        .doc(uid)
        .update({ fcmTokens: FirebaseFirestore.FieldValue.arrayRemove(...invalidTokens) });
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { matchId } = (req.body ?? {}) as { matchId?: string };
  if (!matchId) {
    res.status(400).json({ error: 'matchId gerekli' });
    return;
  }

  getAdminApp();

  const authHeader = req.headers.authorization ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    res.status(401).json({ error: 'Yetkilendirme gerekli' });
    return;
  }
  let email: string | undefined;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    email = decoded.email?.toLowerCase();
  } catch {
    res.status(401).json({ error: 'Geçersiz oturum' });
    return;
  }
  if (!email || !ADMIN_EMAILS.includes(email)) {
    res.status(403).json({ error: 'Bu işlem için admin yetkisi gerekli' });
    return;
  }

  const db = getFirestore();
  const messaging = getMessaging();

  const matchSnap = await db.collection('matches').doc(matchId).get();
  if (!matchSnap.exists) {
    res.status(404).json({ error: 'Maç bulunamadı' });
    return;
  }
  const match = matchSnap.data()!;
  if (!match.result) {
    res.status(400).json({ error: 'Maçın sonucu henüz girilmemiş' });
    return;
  }

  const predSnap = await db.collection('predictions').where('matchId', '==', matchId).get();
  const correctUids: string[] = [];
  const wrongUids: string[] = [];
  predSnap.docs.forEach((d) => {
    const data = d.data();
    (data.isCorrect ? correctUids : wrongUids).push(data.userId as string);
  });

  const liveScore = match.liveScore as { homeGoals: number; awayGoals: number } | null | undefined;
  const scoreText = liveScore ? `${liveScore.homeGoals}-${liveScore.awayGoals}` : '';

  if (correctUids.length > 0) {
    await sendPushToUsers(db, messaging, correctUids, {
      title: '✅ Doğru tahmin!',
      body: `${match.homeTeam} ${scoreText} ${match.awayTeam} bitti - tahminin doğru çıktı!`,
    });
  }
  if (wrongUids.length > 0) {
    await sendPushToUsers(db, messaging, wrongUids, {
      title: 'Maç sonuçlandı',
      body: `${match.homeTeam} ${scoreText} ${match.awayTeam} bitti - bu sefer tutmadı, bir sonrakinde tekrar dene!`,
    });
  }

  res.status(200).json({ notified: correctUids.length + wrongUids.length });
}
