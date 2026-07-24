import { collection, doc, setDoc, deleteDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface AvatarOption {
  key: string;
  label: string;
  logoUrl: string;
}

/** Etiketi, tutarlı bir Firestore doküman ID'sine çevirir. */
function normalizeKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Admin tarafından belirlenen, kullanıcıların profil avatarı olarak
 * seçebileceği sabit logo listesini gerçek zamanlı dinler.
 */
export function subscribeAvatarOptions(
  onChange: (options: AvatarOption[]) => void,
  onError: (message: string) => void,
): () => void {
  return onSnapshot(
    collection(db, 'avatarOptions'),
    (snap) => {
      const options = snap.docs
        .map((d) => ({
          key: d.id,
          label: (d.data().label as string) ?? '',
          logoUrl: (d.data().logoUrl as string) ?? '',
        }))
        .filter((o) => o.label && o.logoUrl)
        .sort((a, b) => a.label.localeCompare(b.label, 'tr'));
      onChange(options);
    },
    () => onError('Avatar seçenekleri yüklenemedi.'),
  );
}

/** Admin: listeye yeni bir avatar seçeneği ekler (aynı etiket varsa üzerine yazar). */
export async function addAvatarOption(label: string, logoUrl: string): Promise<void> {
  const key = normalizeKey(label);
  if (!key || !logoUrl.trim()) throw new Error('Etiket ve görsel linki boş olamaz.');
  await setDoc(doc(db, 'avatarOptions', key), {
    label: label.trim(),
    logoUrl: logoUrl.trim(),
    createdAt: Timestamp.now(),
  });
}

/** Admin: bir avatar seçeneğini listeden kaldırır. */
export async function removeAvatarOption(key: string): Promise<void> {
  await deleteDoc(doc(db, 'avatarOptions', key));
}
