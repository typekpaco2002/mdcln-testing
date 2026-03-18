import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function Confetti({ trigger }) {
  useEffect(() => {
    if (trigger) {
      // Fire confetti
      const duration = 3000;
      const animationEnd = Date.now() + duration;

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#a855f7', '#3b82f6', '#ec4899']
        });

        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#a855f7', '#3b82f6', '#ec4899']
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [trigger]);

  return null;
}

export function fireConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 7,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#a855f7', '#3b82f6', '#ec4899', '#10b981']
    });

    confetti({
      particleCount: 7,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#a855f7', '#3b82f6', '#ec4899', '#10b981']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}
