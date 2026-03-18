import { motion } from 'framer-motion';

export function Skeleton({ className = '', variant = 'rectangular', animation = 'pulse' }) {
  const baseClasses = 'bg-white/5 rounded-lg overflow-hidden relative';
  
  const variantClasses = {
    rectangular: 'w-full h-full',
    circular: 'rounded-full',
    text: 'h-4 w-full rounded-md'
  };
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {animation === 'shimmer' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'linear'
          }}
        />
      )}
      {animation === 'pulse' && (
        <motion.div
          className="absolute inset-0 bg-white/5"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'easeInOut'
          }}
        />
      )}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-ultra p-6 rounded-2xl">
      <Skeleton className="h-48 mb-4" animation="shimmer" />
      <Skeleton className="h-6 w-3/4 mb-2" animation="pulse" />
      <Skeleton className="h-4 w-1/2" animation="pulse" />
    </div>
  );
}

export function GenerationCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-ultra rounded-2xl overflow-hidden"
    >
      {/* Image skeleton */}
      <Skeleton className="aspect-square" animation="shimmer" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" animation="pulse" />
          <Skeleton className="h-6 w-20 rounded-full" animation="pulse" />
        </div>
        <Skeleton className="h-4 w-full" animation="pulse" />
        <Skeleton className="h-4 w-3/4" animation="pulse" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1 rounded-lg" animation="pulse" />
          <Skeleton className="h-9 flex-1 rounded-lg" animation="pulse" />
        </div>
      </div>
    </motion.div>
  );
}

export function ListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-ultra p-4 rounded-xl">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" animation="shimmer" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/3" animation="pulse" />
              <Skeleton className="h-4 w-1/2" animation="pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
