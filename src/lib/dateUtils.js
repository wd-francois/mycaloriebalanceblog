/**
 * Calculate sleep duration between bedtime and waketime
 * @param {Object} bedtime - { hour, minute, period }
 * @param {Object} waketime - { hour, minute, period }
 * @returns {string} Formatted duration string (e.g., "8h 30m")
 */
export function calculateSleepDuration(bedtime, waketime) {
  // Convert to 24-hour format for calculation
  const bedHour24 = bedtime.period === 'AM' ? (bedtime.hour === 12 ? 0 : bedtime.hour) : (bedtime.hour === 12 ? 12 : bedtime.hour + 12);
  const wakeHour24 = waketime.period === 'AM' ? (waketime.hour === 12 ? 0 : waketime.hour) : (waketime.hour === 12 ? 12 : waketime.hour + 12);
  
  const bedMinutes = bedHour24 * 60 + bedtime.minute;
  const wakeMinutes = wakeHour24 * 60 + waketime.minute;
  
  // Handle overnight sleep (bedtime PM, waketime AM)
  let totalMinutes;
  if (bedtime.period === 'PM' && waketime.period === 'AM') {
    totalMinutes = (24 * 60 - bedMinutes) + wakeMinutes;
  } else {
    totalMinutes = wakeMinutes - bedMinutes;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Format a Date as local YYYY-MM-DD (for URLs and storage). Avoids toISOString() which uses UTC and can show the wrong day.
 * @param {Date} date
 * @returns {string}
 */
export function formatDateLocalYYYYMMDD(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date for display using MM/DD/YYYY or DD/MM/YYYY (no locale guessing).
 * @param {Date} date
 * @param {'MM/DD/YYYY'|'DD/MM/YYYY'} format
 * @returns {string} e.g. "4/3/2026" for DD/MM or "3/4/2026" for MM/DD
 */
export function formatDateForDisplay(date, format = 'DD/MM/YYYY') {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const d = String(date.getDate());
  const m = String(date.getMonth() + 1);
  const y = String(date.getFullYear());
  return format === 'DD/MM/YYYY' ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
}

/**
 * Get user's date format from localStorage (same key as SettingsContext). Default DD/MM/YYYY.
 * @returns {'MM/DD/YYYY'|'DD/MM/YYYY'}
 */
export function getDateFormatFromStorage() {
  if (typeof window === 'undefined') return 'DD/MM/YYYY';
  try {
    const s = localStorage.getItem('healthTrackerSettings');
    if (s) {
      const p = JSON.parse(s);
      if (p.dateFormat === 'MM/DD/YYYY' || p.dateFormat === 'DD/MM/YYYY') return p.dateFormat;
    }
  } catch (_) {}
  return 'DD/MM/YYYY';
}

/**
 * Parse a YYYY-MM-DD string as local date (noon to avoid any DST edge cases). Avoids Date(string) which can be UTC in some browsers.
 * @param {string} dateStr - e.g. "2026-03-03"
 * @returns {Date|null} Local date at noon, or null if invalid
 */
export function parseDateLocalYYYYMMDD(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1; // 0-indexed month
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 0 || m > 11 || d < 1 || d > 31) return null;
  const date = new Date(y, m, d, 12, 0, 0);
  if (isNaN(date.getTime()) || date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
  return date;
}

/**
 * Get current time parts
 * @returns {Object} { hour, minute, period }
 */
export function getCurrentTimeParts() {
  const now = new Date();
  const hours24 = now.getHours();
  const hour = hours24 % 12 || 12;
  const minute = now.getMinutes();
  const period = hours24 >= 12 ? 'PM' : 'AM';
  return { hour, minute, period };
}

/**
 * Convert 12h time parts to 24h "HH:MM" string (for TimeInput24Hour).
 * @param {{ hour: number, minute: number, period: string }} time
 * @returns {string} e.g. "14:30"
 */
export function toHHMM(time) {
  if (!time || time.hour == null || time.minute == null) return '00:00';
  let h = Number(time.hour);
  const m = Math.max(0, Math.min(59, Number(time.minute)));
  if (time.period === 'PM' && h !== 12) h += 12;
  if (time.period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Convert 24h "HH:MM" string to 12h time parts.
 * @param {string} hhmm - e.g. "14:30"
 * @returns {{ hour: number, minute: number, period: string }}
 */
export function fromHHMM(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return getCurrentTimeParts();
  const [hStr, mStr] = hhmm.trim().split(':');
  let h = parseInt(hStr, 10);
  const m = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  if (isNaN(h)) return getCurrentTimeParts();
  h = Math.max(0, Math.min(23, h));
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return { hour: hour12, minute: m, period };
}
