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
  const label = showDown ? 'Scroll for more' : 'Scroll back up';

  return (
    <motion.button
      onClick={() => onNavigate(showDown ? 'down' : 'up')}
      className="fixed bottom-28 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-white backdrop-blur-md transition hover:bg-white/20"
      animate={{ y: [0, 8, 0] }}
      transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1 }}
    >
      {showDown ? <ChevronDown className="h-6 w-6" /> : <ChevronUp className="h-6 w-6" />}
      <span className="text-xs font-medium tracking-wide">{label}</span>
    </motion.button>
  );
}
