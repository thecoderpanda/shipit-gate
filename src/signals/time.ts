import type { TimeSignal } from './types.js';

export function collectTime(): TimeSignal {
  const now = new Date();
  const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
  const weekday = weekdayFmt.format(now);
  const hour24 = now.getHours();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    isoLocal: now.toISOString(),
    weekday,
    hour24,
    isFriday: weekday === 'Friday',
    isWeekend: weekday === 'Saturday' || weekday === 'Sunday',
    isAfterHours: hour24 >= 17 || hour24 < 9,
    timezone,
  };
}
