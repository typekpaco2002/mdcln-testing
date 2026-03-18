import { motion } from 'framer-motion';

export default function SplashScreen({ logoUrl, appName = "ModelClone" }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      data-testid="splash-screen"
    >
      <div className="flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-full bg-purple-500/15 blur-2xl" style={{ transform: 'scale(1.5)' }} />
          
          <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/5 border border-white/15 p-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="w-full h-full object-contain"
                loading="eager"
              />
            ) : (
              <span className="text-3xl sm:text-4xl font-black text-white">M</span>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {appName}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex items-center gap-1.5 mt-2"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut'
              }}
              className="w-2 h-2 rounded-full bg-purple-500"
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
