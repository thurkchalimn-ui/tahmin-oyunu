import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, XCircle, Award, UserPlus, Clock, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { markNotificationRead, markAllNotificationsRead } from '@/services/notificationCenterService';
import type { AppNotification, NotificationType } from '@/types';

const TYPE_ICONS: Record<NotificationType, ReactNode> = {
  result: <CheckCircle2 size={16} className="text-pick-correct" />,
  badge: <Award size={16} className="text-scoreboard-amber" />,
  follow: <UserPlus size={16} className="text-scoreboard-amber" />,
  reminder: <Clock size={16} className="text-scoreboard-amber" />,
  levelup: <Crown size={16} className="text-scoreboard-amber" />,
};

/** navbar'daki zil ikonu değişmedi. Wrong-result durumunda üzerine kırmızı işaret bindirilir. */
function iconFor(n: AppNotification) {
  if (n.type === 'result' && n.title.includes('❌')) {
    return <XCircle size={16} className="text-pick-wrong" />;
  }
  return TYPE_ICONS[n.type];
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

/**
 * Navbar'daki zil ikonu + tıklanınca açılan bildirim listesi (dropdown).
 * Okunmamış bildirim sayısı kırmızı bir rozetle gösterilir; panel açılınca
 * (ya da bir bildirime tıklanınca) o bildirim(ler) okundu işaretlenir.
 */
export function NotificationBell() {
  const { firebaseUser } = useAuth();
  const { data: notifications, unreadCount } = useNotifications(firebaseUser?.uid);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Panel dışına tıklanınca kapat
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
  }

  function handleNotificationClick(n: AppNotification) {
    if (!n.isRead) markNotificationRead(n.id).catch(() => {});
  }

  async function handleMarkAllRead() {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    await markAllNotificationsRead(unreadIds).catch(() => {});
  }

  if (!firebaseUser) return null;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Bildirimler"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-pitch-900 transition hover:bg-pitch-700/10 dark:text-pitch-100 dark:hover:bg-pitch-700/40"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-pick-wrong px-1 font-mono text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-pitch-700/15 bg-white shadow-stadium dark:border-pitch-700 dark:bg-pitch-800">
          <div className="flex items-center justify-between border-b border-pitch-700/10 px-4 py-2.5 dark:border-pitch-700/50">
            <h3 className="font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">Bildirimler</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="font-mono text-[11px] text-scoreboard-amber hover:underline"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center font-body text-xs text-pitch-700/50 dark:text-pitch-100/40">
                Henüz bildirimin yok.
              </p>
            ) : (
              notifications.map((n) => {
                const Row = (
                  <div
                    className={`flex gap-2.5 px-4 py-3 transition ${
                      n.isRead
                        ? 'bg-white dark:bg-pitch-800'
                        : 'bg-scoreboard-amber/5 dark:bg-scoreboard-amber/10'
                    } hover:bg-pitch-700/5 dark:hover:bg-pitch-700/30`}
                  >
                    <span className="mt-0.5 shrink-0">{iconFor(n)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-xs font-semibold text-pitch-900 dark:text-pitch-100">
                        {n.title}
                      </p>
                      <p className="truncate font-body text-xs text-pitch-700/60 dark:text-pitch-100/50">
                        {n.body}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-pitch-700/40 dark:text-pitch-100/30">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-scoreboard-amber" />}
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} to={n.link} onClick={() => handleNotificationClick(n)}>
                    {Row}
                  </Link>
                ) : (
                  <button key={n.id} type="button" onClick={() => handleNotificationClick(n)} className="block w-full text-left">
                    {Row}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
