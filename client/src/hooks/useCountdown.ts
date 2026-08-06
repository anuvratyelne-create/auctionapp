import { useState, useEffect, useMemo } from 'react';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

export function useCountdown(targetDate: string | null | undefined, targetTime?: string | null): CountdownResult {
  const [now, setNow] = useState(() => Date.now());

  const targetTimestamp = useMemo(() => {
    if (!targetDate) return null;

    // Parse the target date and time
    const dateStr = targetDate;
    const timeStr = targetTime || '00:00';

    // Create date in local timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    const target = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return target.getTime();
  }, [targetDate, targetTime]);

  useEffect(() => {
    if (!targetTimestamp) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  return useMemo(() => {
    if (!targetTimestamp) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
    }

    const diff = targetTimestamp - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds, isExpired: false, totalSeconds };
  }, [targetTimestamp, now]);
}
