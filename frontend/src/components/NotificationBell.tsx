import { useEffect, useState, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { getNotifications, markAllSeen, subscribe, type Notification } from '../lib/notifications';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const count = items.filter((n) => !n.seen).length;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setItems([...getNotifications()]);
    update();
    return subscribe(update);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleOpen() {
    setOpen((v) => !v);
    markAllSeen();
  }

  return (
    <div ref={ref} className='fixed right-20 top-4 z-50'>
      <button
        onClick={handleOpen}
        className='relative flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-lg backdrop-blur-md transition hover:bg-white/10'
        aria-label='Notifications'
      >
        <Bell className='h-5 w-5' />
        {count > 0 && (
          <span className='absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-black'>
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className='absolute right-0 mt-3 w-64 rounded-2xl border border-white/10 bg-brand-900/95 p-2 shadow-2xl backdrop-blur-xl sm:w-72'>
          <div className='flex items-center justify-between px-3 py-2'>
            <p className='text-sm font-bold text-white'>Notifications</p>
            <button onClick={() => setOpen(false)} className='text-white/60 hover:text-white'>
              <X className='h-4 w-4' />
            </button>
          </div>
          {items.length === 0 ? (
            <p className='px-3 py-4 text-sm text-white/60'>No notifications yet.</p>
          ) : (
            <div className='max-h-80 overflow-y-auto'>
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl px-3 py-2.5 text-sm ${n.seen ? 'text-white/60' : 'bg-white/5 font-medium text-white'}`}
                >
                  <p>{n.message}</p>
                  <p className='mt-1 text-xs text-white/40'>{new Date(n.createdAt).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
