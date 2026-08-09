import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Home, Sparkles } from 'lucide-react';

const VISIT_KEY = 'pwa-visit-count';
const LAST_PATH_KEY = 'pwa-last-path';
const DISMISS_KEY = 'pwa-prompt-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isPWA() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const until = parseInt(raw, 10);
  return Date.now() < until;
}

export default function InstallPrompt() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (isPWA() || installed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    // iOS doesn't fire beforeinstallprompt, but we can still nudge.
    if (isIOS() && !deferredPrompt) {
      setShowIOS(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [installed, deferredPrompt]);

  useEffect(() => {
    if (isPWA() || installed) return;

    const lastPath = sessionStorage.getItem(LAST_PATH_KEY);
    if (lastPath === location.pathname) return;

    sessionStorage.setItem(LAST_PATH_KEY, location.pathname);
    const count = (parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) % 5) + 1;
    localStorage.setItem(VISIT_KEY, String(count));

    if (count === 5 && !isDismissed()) {
      setIsOpen(true);
    }
  }, [location.pathname, installed]);

  const handleDismiss = () => {
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(tomorrow));
    setIsOpen(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    }
    setIsOpen(false);
  };

  if (isPWA() || installed) return null;

  const canInstall = !!deferredPrompt || showIOS;

  return (
    <AnimatePresence>
      {isOpen && canInstall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-brand-900 p-6 text-center shadow-2xl"
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
            <div className="absolute -left-8 top-1/2 h-24 w-24 rounded-full bg-white/5" />

            <div className="mb-6 flex justify-center">
              <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5">
                <Sparkles className="h-8 w-8 text-white/80" />
                <div className="absolute -right-2 -top-2 rounded-full bg-emerald-500 p-1.5">
                  <Home className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-black text-white">Install OYE Well</h2>
            <p className="mt-2 text-sm text-white/70">
              Add to your home screen for the fastest way to order your favourites.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
              {deferredPrompt ? (
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <Download className="h-5 w-5 text-emerald-300" />
                  <span>One tap and the app lives on your device.</span>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-emerald-300" />
                    <span>Tap the Share button in your browser.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-emerald-300" />
                    <span>Then choose "Add to Home Screen".</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-3">
              {deferredPrompt ? (
                <button
                  onClick={handleInstall}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-black transition hover:bg-white/90"
                >
                  <Download className="h-4 w-4" /> Install now
                </button>
              ) : (
                <button
                  onClick={() => setIsOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-black transition hover:bg-white/90"
                >
                  Got it
                </button>
              )}

              <button
                onClick={handleDismiss}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10"
              >
                Maybe later — 24 hours
              </button>
            </div>

            <button
              onClick={handleDismiss}
              className="absolute right-4 top-4 rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
