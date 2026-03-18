import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Zap, Mail } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect, useRef } from 'react';

export default function PurchaseSuccessModal({ isOpen, onClose, credits, type = 'subscription', tierName = null }) {
  const confettiIntervalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti animation
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999 };

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      confettiIntervalRef.current = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(confettiIntervalRef.current);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => {
        if (confettiIntervalRef.current) {
          clearInterval(confettiIntervalRef.current);
        }
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
          />

          <div 
            className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="rounded-3xl p-8 max-w-md w-full relative overflow-hidden glass-panel-strong"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-9 h-9 rounded-lg glass-card flex items-center justify-center"
                  data-testid="button-close-success-modal"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Success icon */}
                <div className="flex justify-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center"
                  >
                    <CheckCircle className="w-12 h-12 text-white" />
                  </motion.div>
                </div>

                {/* Heading */}
                <h2 className="text-3xl font-bold text-center mb-2 gradient-text">
                  {type === 'subscription' ? 'Welcome to ' + (tierName || 'Your Plan') : 'Purchase Confirmed'}
                </h2>
                <p className="text-center text-gray-400 mb-6">
                  {type === 'subscription' 
                    ? 'Your subscription is now active and ready to use.'
                    : 'Your credits have been added to your account.'
                  }
                </p>

                {/* Credits display */}
                <div className="relative overflow-hidden rounded-2xl p-8 mb-6 glass-card">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10" />
                  
                  <div className="relative text-center">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                    <div className="text-6xl font-bold gradient-text mb-2">
                      +{credits.toLocaleString()}
                    </div>
                    <div className="text-gray-400">Credits Added</div>
                  </div>
                </div>

                {/* Email notification */}
                <div className="rounded-xl p-4 mb-6 flex items-start gap-3 glass-card">
                  <Mail className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">
                      <strong>Check your email</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      We've sent you a confirmation with all the transaction details.
                    </p>
                  </div>
                </div>

                {/* Info cards */}
                {type === 'subscription' ? (
                  <div className="space-y-3 mb-6">
                    <div className="rounded-lg p-3 text-sm glass-card">
                      <p className="text-gray-300">Credits renew automatically each billing period</p>
                    </div>
                    <div className="rounded-lg p-3 text-sm glass-card">
                      <p className="text-gray-300">Unused credits expire at end of billing period</p>
                    </div>
                    <div className="rounded-lg p-3 text-sm glass-card">
                      <p className="text-gray-300">Cancel anytime from Settings</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    <div className="rounded-lg p-3 text-sm glass-card">
                      <p className="text-gray-300">Your credits never expire</p>
                    </div>
                    <div className="rounded-lg p-3 text-sm glass-card">
                      <p className="text-gray-300">Use them at your own pace</p>
                    </div>
                    <div className="rounded-lg p-3 text-sm glass-card">
                      <p className="text-gray-300">Purchase more anytime at $0.012/credit</p>
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-blue-500 hover:scale-105 transition-transform"
                  data-testid="button-start-creating"
                >
                  Go to Dashboard
                </button>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
