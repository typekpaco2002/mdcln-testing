import { motion } from 'framer-motion';
import BrandMark from './BrandMark.jsx';

export default function SplashScreen({ logoUrl, appName = "ModelClone" }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'var(--bg-page)' }}
      data-testid="splash-screen"
    >
      <div className="flex flex-col items-center gap-5">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={appName}
              className="w-14 h-14 rounded-xl object-contain"
              loading="eager"
            />
          ) : (
            <BrandMark size={56} title={appName} forceSvg />
          )}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="text-[17px] font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
        >
          {appName}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-center gap-1 mt-1"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
              className="w-1 h-1 rounded-full"
              style={{ background: 'var(--text-muted)' }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
