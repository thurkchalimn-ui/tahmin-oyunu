import type { StatsPeriod } from '@/utils/periodUtils';

interface PeriodTabsProps {
  value: StatsPeriod;
  onChange: (period: StatsPeriod) => void;
}

const TABS: { key: StatsPeriod; label: string }[] = [
  { key: 'week', label: 'Haftalık' },
  { key: 'month', label: 'Aylık' },
  { key: 'all', label: 'Genel' },
];

/** Haftalık / Aylık / Genel arasında geçiş yapmak için kullanılan sekme çubuğu. */
export function PeriodTabs({ value, onChange }: PeriodTabsProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-pitch-700/5 p-1 dark:bg-pitch-800">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 rounded-md py-1.5 font-mono text-xs font-bold uppercase tracking-wide transition ${
            value === t.key
              ? 'bg-scoreboard-amber text-pitch-950 shadow-glow'
              : 'text-pitch-700/60 hover:text-pitch-900 dark:text-pitch-100/50 dark:hover:text-pitch-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
