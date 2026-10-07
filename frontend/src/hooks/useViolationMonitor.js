import { useEffect, useRef } from 'react';

/**
 * Hook to detect tab switches, window blurs, and visibility changes during test taking.
 * @param {boolean} isActive - Whether monitoring is enabled
 * @param {function} onViolation - Callback invoked with violation type ('TAB_SWITCH' | 'WINDOW_BLUR')
 */
export function useViolationMonitor(isActive, onViolation) {
  const lastViolationTimeRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    const triggerViolation = (type) => {
      const now = Date.now();
      // Debounce events firing simultaneously (e.g. visibility change + blur within 800ms)
      if (now - lastViolationTimeRef.current > 800) {
        lastViolationTimeRef.current = now;
        if (typeof onViolation === 'function') {
          onViolation(type);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('TAB_SWITCH');
      }
    };

    const handleBlur = () => {
      triggerViolation('WINDOW_BLUR');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, onViolation]);
}

export default useViolationMonitor;
