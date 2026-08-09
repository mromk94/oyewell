import { motion } from 'framer-motion';

interface OrderButtonProps {
  label?: string;
  onClick?: () => void;
  to?: string;
}

export default function OrderButton({ label = 'Order', onClick }: OrderButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-bold text-black shadow-2xl outline-none ring-offset-2 ring-offset-black focus-visible:ring-2 focus-visible:ring-white"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95, y: 4 }}
    >
      <span className="drop-shadow-sm">{label}</span>
    </motion.button>
  );
}
