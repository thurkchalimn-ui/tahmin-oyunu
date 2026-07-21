import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftDateKey, todayKey } from '@/utils/dateUtils';

interface DateNavigatorProps {
  date: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
}

/** Günler arasında ileri/geri gezinme ve takvimden doğrudan tarih seçme kontrolü. */
export function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const isToday = date === todayKey();

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(shiftDateKey(date, -1))}
        aria-label="Önceki gün"
        className="flex h-8 w-8 items-center justify-center rounded-md text-pitch-700 transition
          hover:bg-pitch-700/10 dark:text-pitch-100 dark:hover:bg-pitch-700"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="rounded-md border border-pitch-700/20 bg-transparent px-2 py-1 font-mono text-xs
          text-pitch-900 dark:border-pitch-700 dark:text-pitch-100"
      />

      {!isToday && (
        <button
          onClick={() => onChange(todayKey())}
          className="rounded-md bg-scoreboard-amber/15 px-2 py-1 font-mono text-[10px] font-bold
            text-scoreboard-amberDark dark:text-scoreboard-amber"
        >
          Bugün
        </button>
      )}

      <button
        onClick={() => onChange(shiftDateKey(date, 1))}
        aria-label="Sonraki gün"
        className="flex h-8 w-8 items-center justify-center rounded-md text-pitch-700 transition
          hover:bg-pitch-700/10 dark:text-pitch-100 dark:hover:bg-pitch-700"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
