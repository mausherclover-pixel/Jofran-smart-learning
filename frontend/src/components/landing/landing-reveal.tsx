'use client';

import { motion } from 'framer-motion';

// The one orchestrated moment on the landing page — everything else stays
// still, per the brief's "less is more" instinct for motion.
export function LandingReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
