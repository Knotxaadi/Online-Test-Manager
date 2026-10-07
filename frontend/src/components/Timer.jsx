import React, { useState, useEffect, useRef } from 'react';

/**
 * Server-synchronized Countdown Timer
 * @param {string} expiresAt - ISO string of test expiration time from server
 * @param {string} serverNow - ISO string of current server time when attempt was loaded
 * @param {function} onExpire - Callback when time reaches 0
 */
export function Timer({ expiresAt, serverNow, onExpire }) {
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const onExpireCalledRef = useRef(false);

  useEffect(() => {
    if (!expiresAt) return;

    // Calculate time offset between client machine and backend server
    const serverTimeMs = serverNow ? new Date(serverNow).getTime() : Date.now();
    const clientTimeMs = Date.now();
    const serverOffset = serverTimeMs - clientTimeMs;

    const expiryMs = new Date(expiresAt).getTime();

    const calculateRemaining = () => {
      const currentServerTime = Date.now() + serverOffset;
      const diffMs = expiryMs - currentServerTime;
      return Math.max(0, Math.floor(diffMs / 1000));
    };

    setSecondsRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (!onExpireCalledRef.current) {
          onExpireCalledRef.current = true;
          if (typeof onExpire === 'function') {
            onExpire();
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, serverNow, onExpire]);

  // Format mm:ss or hh:mm:ss
  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const formattedTime = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Color tokens based on remaining time (DESIGN.md)
  let timerColor = 'var(--color-primary)';
  let bgHighlight = '#eff6ff';

  if (secondsRemaining < 60) {
    timerColor = 'var(--color-danger)'; // Critical (< 1 min)
    bgHighlight = '#fef2f2';
  } else if (secondsRemaining < 300) {
    timerColor = 'var(--color-warning)'; // Warning (< 5 mins)
    bgHighlight = '#fffbeb';
  }

  return (
    <div
      role="timer"
      aria-label={`Time remaining: ${minutes} minutes and ${seconds} seconds`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.85rem',
        backgroundColor: bgHighlight,
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${timerColor}`,
        color: timerColor,
        fontWeight: 600,
        fontSize: '1.15rem',
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      <span>⏱</span>
      <span>{formattedTime}</span>
    </div>
  );
}

export default Timer;
