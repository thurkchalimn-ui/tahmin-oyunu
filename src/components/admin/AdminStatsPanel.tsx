import { useEffect, useState } from 'react';
import { getAdminStats, type AdminStats } from '@/services/adminStatsService';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

/** Admin panelinde toplam kullanıcı, aktif kullanıcı ve popüler lig özetini gösterir. */
export function AdminStatsPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => setError('İstatistikler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="İstatistikler yükleniyor..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!stats) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Toplam Kullanıcı" value={stats.totalUsers} />
        <StatCard label="Aktif (Son 7 Gün)" value={stats.activeUsersLast7Days} />
        <StatCard label="Toplam Maç" value={stats.totalMatches} />
        <StatCard label="Toplam Tahmin" value={stats.totalPredictions} />
      </div>

      {stats.topLeagues.length > 0 && (
        <div className="rounded-lg border border-pitch-700/15 bg-white p-3 dark:border-pitch-700 dark:bg-pitch-800">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
            En Çok Maçı Olan Ligler (Son 30 Gün)
          </p>
          <div className="flex flex-col gap-1">
            {stats.topLeagues.map((l) => (
              <div key={l.league} className="flex items-center justify-between font-mono text-xs">
                <span className="text-pitch-900 dark:text-pitch-100">{l.league}</span>
                <span className="text-pitch-700/60 dark:text-pitch-100/50">{l.matchCount} maç</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-pitch-700/15 bg-white p-3 text-center dark:border-pitch-700 dark:bg-pitch-800">
      <p className="font-mono text-xl font-bold text-scoreboard-amber">{value}</p>
      <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">{label}</p>
    </div>
  );
}
