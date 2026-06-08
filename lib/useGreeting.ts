'use client';

import { useEffect, useRef, useState } from 'react';

export interface Greeting {
  text: string;
  emoji: string;
}

const NAME = 'Sylven Groenendaal';

function buildGreeting(hour: number): Greeting {
  if (hour >= 5 && hour < 12)  return { text: `Good morning ${NAME}`,  emoji: '☀️'  };
  if (hour >= 12 && hour < 18) return { text: `Good afternoon ${NAME}`, emoji: '🌤️' };
  return                               { text: `Good evening ${NAME}`,   emoji: '🌙' };
}

/**
 * Returns a time-of-day greeting that re-evaluates every minute,
 * aligned to the wall clock so the message flips exactly at 05:00 / 12:00 / 18:00.
 */
export function useGreeting(): Greeting {
  const [greeting, setGreeting] = useState<Greeting>(() =>
    buildGreeting(new Date().getHours())
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);

  useEffect(() => {
    function tick() {
      setGreeting(buildGreeting(new Date().getHours()));
    }

    // Wait until the top of the next minute, then poll every 60 s.
    // This keeps the flip precise (± 1 s) without hammering the timer.
    const msUntilNextMinute =
      (60 - new Date().getSeconds()) * 1000 - new Date().getMilliseconds();

    timeoutRef.current = setTimeout(() => {
      tick();
      intervalRef.current = setInterval(tick, 60_000);
    }, msUntilNextMinute);

    return () => {
      if (timeoutRef.current)  clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return greeting;
}
