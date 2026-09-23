/**
 * Date utility functions for Giri-Giri daily finance calculations
 */

/**
 * Format Date object to YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD to Date object at local midnight
 */
export function parseDateISO(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Get Today's date string YYYY-MM-DD
 */
export function getTodayISO(): string {
  return formatDateISO(new Date());
}

/**
 * Add N calendar days to YYYY-MM-DD string
 */
export function addDaysISO(dateStr: string, days: number): string {
  const d = parseDateISO(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

/**
 * Compare two date strings (YYYY-MM-DD)
 * Returns: -1 if date1 < date2, 0 if date1 === date2, 1 if date1 > date2
 */
export function compareDates(date1: string, date2: string): number {
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
}

export function isSameDay(date1: string, date2: string): boolean {
  return date1 === date2;
}

export function isBeforeDay(date1: string, date2: string): boolean {
  return date1 < date2;
}

export function isAfterDay(date1: string, date2: string): boolean {
  return date1 > date2;
}

/**
 * Calculate difference in days between two YYYY-MM-DD strings (date2 - date1)
 */
export function getDaysDifference(startDateStr: string, endDateStr: string): number {
  const d1 = parseDateISO(startDateStr);
  const d2 = parseDateISO(endDateStr);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format for UI display: "22 Sep 2026" or "22 Sep"
 */
export function formatDisplayDate(dateStr: string, includeYear: boolean = true): string {
  if (!dateStr) return '';
  const d = parseDateISO(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`;
}

/**
 * Format day of week: "Mon", "Tue", "Wed"
 */
export function formatDayOfWeek(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseDateISO(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

/**
 * Format for timestamp in receipts: "22 Sep 2026, 09:45 PM"
 */
export function formatTimestamp(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
