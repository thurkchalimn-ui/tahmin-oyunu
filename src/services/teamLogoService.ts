import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface TeamLogoOption {
  teamName: string;
  logoUrl: string;
}

/**
 * `teamLogos` koleksiyonundaki (admin maç eklerken otomatik biriken) tüm
 * takım logolarını getirir. Kullanıcıların profil avatarı olarak bir takım
 * logosu seçebilmesi için kullanılır - ayrı bir görsel kaynağına gerek kalmaz,
 * zaten sistemde kayıtlı gerçek logolar kullanılır.
 */
export async function getAllTeamLogos(): Promise<TeamLogoOption[]> {
  const snap = await getDocs(collection(db, 'teamLogos'));
  return snap.docs
    .map((d) => ({
      teamName: (d.data().teamName as string) ?? '',
      logoUrl: (d.data().logoUrl as string) ?? '',
    }))
    .filter((t) => t.teamName && t.logoUrl)
    .sort((a, b) => a.teamName.localeCompare(b.teamName, 'tr'));
}
