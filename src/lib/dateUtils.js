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
