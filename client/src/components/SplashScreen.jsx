import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion.js';

const DEFAULT_VIDEO_URL = '/splash.mp4';
// Hard cap so a stalled / unsupported video can't keep the splash up forever.
const FALLBACK_DURATION_MS = 4000;
// When reduced-motion is on, skip the video entirely and fade out fast.
const REDUCED_MOTION_DURATION_MS = 400;

/**
 * Boot splash that plays a short looping-disabled video fullscreen-cover and
 * dismisses precisely when playback ends. No logo fallback — the splash is
 * the brand intro itself; if the video can't play we just exit fast.
 *
 * Respects prefers-reduced-motion by skipping the video entirely.
 */
export default function SplashScreen({ onFinish }) {
  const finishedRef = useRef(false);
  const videoRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.();
  };

  useEffect(() => {
    const duration = reduceMotion ? REDUCED_MOTION_DURATION_MS : FALLBACK_DURATION_MS;
    const fallback = window.setTimeout(finish, duration);
    return () => window.clearTimeout(fallback);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const v = videoRef.current;
    if (!v) return undefined;
    // Some browsers (notably iOS Safari) need a user-gesture-free .play() kick
    // even with the autoplay attribute. If play() rejects (autoplay blocked)
    // we dismiss immediately rather than waiting on the long fallback timeout.
    const playPromise = v.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        finish();
      });
    }
    return undefined;
  }, [reduceMotion]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.2 : 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-[var(--z-splash,9999)] overflow-hidden"
      style={{ background: '#000' }}
      data-testid="splash-screen"
    >
      {!reduceMotion && (
        <video
          ref={videoRef}
          src={DEFAULT_VIDEO_URL}
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controls={false}
          onEnded={finish}
          onError={finish}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          // Small letterbox is preferable to cropping brand content on
          // extreme aspect ratios (ultrawide / iPhone SE).
          style={{ objectFit: 'contain', objectPosition: 'center', background: '#000' }}
        />
      )}
    </motion.div>
  );
}
