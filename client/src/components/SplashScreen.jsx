import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import BrandMark from './BrandMark.jsx';

const DEFAULT_GIF_URL = '/splash.gif';
const FALLBACK_DURATION_MS = 3500;
const MIN_DURATION_MS = 1200;

/**
 * Parse a GIF's binary to compute the total duration of one full playthrough by
 * summing every Graphics Control Extension's delay field (centiseconds).
 *
 * Returns total duration in ms, or null if parsing fails / no delays found.
 */
async function measureGifDurationMs(url) {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 6) return null;
    if (buf[0] !== 0x47 || buf[1] !== 0x49 || buf[2] !== 0x46) return null;

    let total = 0;
    for (let i = 0; i < buf.length - 8; i += 1) {
      if (buf[i] === 0x21 && buf[i + 1] === 0xf9 && buf[i + 2] === 0x04) {
        const delayCs = buf[i + 4] | (buf[i + 5] << 8);
        total += Math.max(delayCs, 1) * 10;
      }
    }
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

export default function SplashScreen({
  logoUrl,
  appName = 'ModelClone',
  gifUrl = DEFAULT_GIF_URL,
  onFinish,
}) {
  const [gifReady, setGifReady] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.();
  };

  useEffect(() => {
    let cancelled = false;
    let timer;

    (async () => {
      const measured = await measureGifDurationMs(gifUrl);
      if (cancelled) return;
      const duration = Math.max(measured ?? FALLBACK_DURATION_MS, MIN_DURATION_MS);
      timer = window.setTimeout(finish, duration);
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [gifUrl]);

  useEffect(() => {
    if (!gifFailed) return;
    const t = window.setTimeout(finish, MIN_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [gifFailed]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ background: '#000' }}
      data-testid="splash-screen"
    >
      {!gifFailed ? (
        <img
          src={gifUrl}
          alt={appName}
          decoding="async"
          fetchpriority="high"
          loading="eager"
          onLoad={() => setGifReady(true)}
          onError={() => setGifFailed(true)}
          className="absolute inset-0 h-full w-full"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: gifReady ? 1 : 0,
            transition: 'opacity 200ms ease-out',
          }}
        />
      ) : null}

      {(!gifReady || gifFailed) && (
        <div className="absolute inset-0 flex items-center justify-center">
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
                  className="h-14 w-14 rounded-xl object-contain"
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
              style={{ color: 'var(--text-primary, #fff)', letterSpacing: '-0.01em' }}
            >
              {appName}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-1 flex items-center gap-1"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                  className="h-1 w-1 rounded-full"
                  style={{ background: 'var(--text-muted, rgba(255,255,255,0.6))' }}
                />
              ))}
            </motion.div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
