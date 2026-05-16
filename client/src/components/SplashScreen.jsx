import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const DEFAULT_VIDEO_URL = '/splash.mp4';
// Hard cap so a stalled / unsupported video can't keep the splash up forever.
const FALLBACK_DURATION_MS = 4000;

/**
 * Boot splash that plays a short looping-disabled video fullscreen-cover and
 * dismisses precisely when playback ends. No logo fallback — the splash is
 * the brand intro itself; if the video can't play we just exit fast.
 */
export default function SplashScreen({ onFinish }) {
  const finishedRef = useRef(false);
  const videoRef = useRef(null);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.();
  };

  useEffect(() => {
    const fallback = window.setTimeout(finish, FALLBACK_DURATION_MS);
    return () => window.clearTimeout(fallback);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    // Some browsers (notably iOS Safari) need a user-gesture-free .play() kick
    // even with the autoplay attribute. Catch the rejection silently — the
    // fallback timeout will dismiss the splash either way.
    const playPromise = v.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
    return undefined;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ background: '#000' }}
      data-testid="splash-screen"
    >
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
        className="absolute inset-0 h-full w-full"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />
    </motion.div>
  );
}
