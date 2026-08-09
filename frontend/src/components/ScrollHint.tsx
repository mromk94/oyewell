import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ScrollHintProps {
  canScrollUp: boolean;
  canScrollDown: boolean;
  onNavigate: (direction: 'up' | 'down') => void;
}

export default function ScrollHint({ canScrollUp, canScrollDown, onNavigate }: ScrollHintProps) {
  if (!canScrollUp && !canScrollDown) return null;

  const showDown = canScrollDown;

  return (
    <motion.button
      onClick={() => onNavigate(showDown ? 'down' : 'up')}
      className="fixed left-1/2 top-1/2 z-40 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-400/60 bg-black/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)] backdrop-blur-sm transition hover:border-amber-400 hover:bg-black/30 hover:text-amber-200"
      animate={{ y: [0, 6, 0] }}
      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      aria-label={showDown ? 'Scroll down for more' : 'Scroll back up'}
    >
      {showDown ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
    </motion.button>
  );
}
