import { useEffect, useState } from 'react';
import { getAllTeamLogos, type TeamLogoOption } from '@/services/teamLogoService';

/** Avatar seçici için sistemde kayıtlı tüm takım logolarını getirir. */
export function useTeamLogos(): { data: TeamLogoOption[]; loading: boolean } {
  const [data, setData] = useState<TeamLogoOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAllTeamLogos()
      .then((logos) => {
        if (!cancelled) setData(logos);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
