import { useState, useEffect } from 'react';

/**
 * Hook to detect if the page is visible (not hidden/minimized)
 * Returns true when page is visible, false when hidden
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(() => typeof document !== 'undefined' ? !document.hidden : true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
      console.log('👁️ Page visibility changed:', !document.hidden ? 'visible' : 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
