import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  documentId,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { League, UserProfile } from '@/types';
import { mapUserDoc } from '@/services/userService';

function mapLeagueDoc(id: string, data: Record<string, unknown>): League {
  const createdAt = data.createdAt;
  return {
    id,
    name: (data.name as string) ?? 'İsimsiz Lig',
    ownerUid: data.ownerUid as string,
    memberUids: (data.memberUids as string[]) ?? [],
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : '',
  };
}

/** Yeni bir özel lig kurar. Kurucu otomatik olarak üye listesine eklenir. */
export async function createLeague(name: string, ownerUid: string, memberUids: string[]): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Lig adı boş olamaz.');
  const allMembers = [...new Set([ownerUid, ...memberUids])];
  const ref = doc(collection(db, 'leagues'));
  await setDoc(ref, {
    name: trimmed,
    ownerUid,
    memberUids: allMembers,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

/** Kullanıcının üyesi olduğu tüm ligleri gerçek zamanlı dinler. */
export function subscribeUserLeagues(
  uid: string,
  onChange: (leagues: League[]) => void,
  onError: (message: string) => void,
): () => void {
  const q = query(collection(db, 'leagues'), where('memberUids', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapLeagueDoc(d.id, d.data()))),
    () => onError('Ligler yüklenemedi.'),
  );
}

/** Tek bir ligi ID ile getirir. */
export async function getLeague(leagueId: string): Promise<League | null> {
  const snap = await getDoc(doc(db, 'leagues', leagueId));
  if (!snap.exists()) return null;
  return mapLeagueDoc(snap.id, snap.data());
}

/** Lige yeni bir üye ekler (sadece kurucu çağırmalı - kural bunu zorunlu kılar). */
export async function addLeagueMember(leagueId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'leagues', leagueId), { memberUids: arrayUnion(uid) });
}

/** Ligden bir üyeyi çıkarır (sadece kurucu çağırmalı - kural bunu zorunlu kılar). */
export async function removeLeagueMember(leagueId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'leagues', leagueId), { memberUids: arrayRemove(uid) });
}

/** Ligi tamamen siler (sadece kurucu çağırmalı - kural bunu zorunlu kılar). */
export async function deleteLeague(leagueId: string): Promise<void> {
  await deleteDoc(doc(db, 'leagues', leagueId));
}

/**
 * Verilen üye ID'lerine ait profilleri getirip tüm-zamanlar en iyi serisine
 * göre sıralar - bir liginin liderlik tablosunu oluşturmak için kullanılır.
 * Üye sayısı genelde küçük (bir arkadaş grubu) olduğu için tek seferlik,
 * toplu bir okuma yeterlidir.
 */
export async function getLeagueLeaderboard(memberUids: string[]): Promise<UserProfile[]> {
  if (memberUids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < memberUids.length; i += 30) chunks.push(memberUids.slice(i, i + 30));

  const profiles: UserProfile[] = [];
  for (const chunk of chunks) {
    const snap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
    snap.docs.forEach((d) => profiles.push(mapUserDoc(d.id, d.data())));
  }

  return profiles.sort((a, b) => b.bestStreak - a.bestStreak || b.correctPredictions - a.correctPredictions);
}
