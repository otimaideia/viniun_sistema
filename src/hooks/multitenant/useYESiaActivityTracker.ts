import { useEffect, useRef, useCallback } from 'react';

interface ActivityData {
  currentPage: string;
  pageEnteredAt: number;
  timeOnPageMs: number;
  idleTimeMs: number;
  lastActivityAt: number;
  isIdle: boolean;
}

interface UseYESiaActivityTrackerOptions {
  /** Callback fired every interval with current activity data */
  onActivity?: (activity: ActivityData) => void;
  /** Interval in ms to send activity updates (default: 30000) */
  intervalMs?: number;
  /** Time in ms before user is considered idle (default: 120000 = 2 min) */
  idleThresholdMs?: number;
}

const IDLE_THRESHOLD_DEFAULT = 120_000; // 2 minutes
const INTERVAL_DEFAULT = 30_000; // 30 seconds

export function useYESiaActivityTracker(options?: UseYESiaActivityTrackerOptions) {
  const {
    onActivity,
    intervalMs = INTERVAL_DEFAULT,
    idleThresholdMs = IDLE_THRESHOLD_DEFAULT,
  } = options || {};

  const activityRef = useRef<ActivityData>({
    currentPage: typeof window !== 'undefined' ? window.location.pathname : '',
    pageEnteredAt: Date.now(),
    timeOnPageMs: 0,
    idleTimeMs: 0,
    lastActivityAt: Date.now(),
    isIdle: false,
  });

  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  // Track user interaction events (mouse, keyboard, touch, scroll)
  useEffect(() => {
    const handleUserActivity = () => {
      const now = Date.now();
      activityRef.current.lastActivityAt = now;
      activityRef.current.isIdle = false;
      activityRef.current.idleTimeMs = 0;
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, []);

  // Track page changes
  useEffect(() => {
    const checkPage = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== activityRef.current.currentPage) {
        activityRef.current.currentPage = currentPath;
        activityRef.current.pageEnteredAt = Date.now();
        activityRef.current.timeOnPageMs = 0;
      }
    };

    // Listen for popstate (back/forward) and periodic check
    window.addEventListener('popstate', checkPage);

    const pageCheckInterval = setInterval(checkPage, 1000);

    return () => {
      window.removeEventListener('popstate', checkPage);
      clearInterval(pageCheckInterval);
    };
  }, []);

  // Main interval: update computed values and fire callback
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - activityRef.current.lastActivityAt;

      // Update computed fields
      activityRef.current.timeOnPageMs = now - activityRef.current.pageEnteredAt;
      activityRef.current.isIdle = timeSinceLastActivity >= idleThresholdMs;
      activityRef.current.idleTimeMs = activityRef.current.isIdle ? timeSinceLastActivity : 0;

      // Fire callback with a snapshot (not the ref itself)
      if (onActivityRef.current) {
        onActivityRef.current({ ...activityRef.current });
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, idleThresholdMs]);

  const getCurrentActivity = useCallback((): ActivityData => {
    const now = Date.now();
    const timeSinceLastActivity = now - activityRef.current.lastActivityAt;

    return {
      ...activityRef.current,
      timeOnPageMs: now - activityRef.current.pageEnteredAt,
      isIdle: timeSinceLastActivity >= idleThresholdMs,
      idleTimeMs: timeSinceLastActivity >= idleThresholdMs ? timeSinceLastActivity : 0,
    };
  }, [idleThresholdMs]);

  const getPageTime = useCallback((): number => {
    return Date.now() - activityRef.current.pageEnteredAt;
  }, []);

  const isIdle = useCallback((): boolean => {
    return (Date.now() - activityRef.current.lastActivityAt) >= idleThresholdMs;
  }, [idleThresholdMs]);

  return {
    getCurrentActivity,
    getPageTime,
    isIdle,
  };
}
