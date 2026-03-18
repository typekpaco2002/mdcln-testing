import { useEffect, useRef } from 'react';

export default function CursorGlow() {
  const dotRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const dot = dotRef.current;
    const glow = glowRef.current;
    if (!dot || !glow) return;

    const style = document.createElement('style');
    style.id = 'cursor-glow-hide';
    style.textContent = '*, *::before, *::after { cursor: none !important; }';
    document.head.appendChild(style);

    let rafId;
    const onMove = (e) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const x = e.clientX;
        const y = e.clientY;
        dot.style.transform = `translate(${x}px, ${y}px)`;
        glow.style.transform = `translate(${x}px, ${y}px)`;
        dot.style.opacity = '1';
      });
    };

    const onLeave = () => { dot.style.opacity = '0'; glow.style.opacity = '0'; };
    const onEnter = () => { dot.style.opacity = '1'; };

    const onDown = () => {
      dot.style.transform = dot.style.transform;
      glow.style.transition = 'opacity 0.08s ease, transform 0.08s ease';
      glow.style.opacity = '1';
      glow.style.transform = glow.style.transform.replace('scale(0.8)', '') + ' scale(1)';
    };
    const onUp = () => {
      glow.style.transition = 'opacity 0.5s ease';
      glow.style.opacity = '0';
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      document.getElementById('cursor-glow-hide')?.remove();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          width: '8px',
          height: '8px',
          marginLeft: '-4px',
          marginTop: '-4px',
          borderRadius: '50%',
          opacity: 0,
          background: 'rgba(255,255,255,0.9)',
          boxShadow: '0 0 6px 1px rgba(255,255,255,0.5)',
          willChange: 'transform',
          transition: 'opacity 0.2s ease',
        }}
      />
      <div
        ref={glowRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998]"
        style={{
          width: '120px',
          height: '120px',
          marginLeft: '-60px',
          marginTop: '-60px',
          borderRadius: '50%',
          opacity: 0,
          background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(200,185,255,0.18) 45%, transparent 70%)',
          willChange: 'transform, opacity',
        }}
      />
    </>
  );
}
