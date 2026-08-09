import { motion } from 'framer-motion';
import { ChefHat } from 'lucide-react';

export default function Preloader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-brand-900"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="rounded-full border border-amber-400/30 bg-black/20 p-6 shadow-[0_0_30px_rgba(251,191,36,0.15)]"
      >
        <ChefHat className="h-10 w-10 text-amber-300" strokeWidth={1.5} />
      </motion.div>
      <h1 className="mt-6 text-3xl font-black tracking-tight text-white">
        OYE <span className="font-light">Well</span>
      </h1>
      <p className="mt-2 text-sm tracking-wide text-amber-200/70">
        Preparing your experience…
      </p>
    </motion.div>
  );
}
