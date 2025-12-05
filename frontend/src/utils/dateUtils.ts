/**
 * Date Utilities - Timezone-safe date handling
 *
 * This module provides utilities to handle dates consistently across timezones.
 * All dates are treated as local calendar dates (YYYY-MM-DD) without time components.
 */

/**
 * Parse a date string (YYYY-MM-DD) as a local date at midnight
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object at local midnight
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object as YYYY-MM-DD in local timezone
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 */
export function getTodayLocal(): string {
  return formatLocalDate(new Date());
}

/**
 * Add days to a date string
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param days - Number of days to add (can be negative)
 * @returns New date string in YYYY-MM-DD format
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

/**
 * Get the day of week (0 = Sunday, 6 = Saturday) for a date string
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Day of week number (0-6)
 */
export function getDayOfWeek(dateStr: string): number {
  return parseLocalDate(dateStr).getDay();
}

/**
 * Format a date string for display
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted string like "Mon\n12/10"
 */
export function formatDateDisplay(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[date.getDay()];
  const month = date.getMonth() + 1;
  const dateNum = date.getDate();
  return `${day}\n${month}/${dateNum}`;
}

/**
 * Get the first Sunday on or before a date
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date string of the first Sunday
 */
export function getFirstSunday(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const dayOfWeek = date.getDay();
  date.setDate(date.getDate() - dayOfWeek);
  return formatLocalDate(date);
}

/**
 * Get the last Saturday on or after a date
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date string of the last Saturday
 */
export function getLastSaturday(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const dayOfWeek = date.getDay();
  date.setDate(date.getDate() + (6 - dayOfWeek));
  return formatLocalDate(date);
}

/**
 * Calculate difference in days between two date strings
 * @param start - Start date string in YYYY-MM-DD format
 * @param end - End date string in YYYY-MM-DD format
 * @returns Number of days (can be negative if end is before start)
 */
export function diffInDays(start: string, end: string): number {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format hour as 12-hour time string (e.g., "9 AM", "2 PM")
 * @param hour - Hour in 24-hour format (0-23)
 * @returns Formatted time string
 */
export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

/**
 * Format hour as HH:00 string (e.g., "09:00", "14:00")
 * @param hour - Hour in 24-hour format (0-23)
 * @returns Formatted time string
 */
export function formatHourTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}
