/**
 * Date formatting utilities for consistent date display across the application
 * Format: 10 Aug 2025
 * All dates are displayed in Qatar timezone (GST, UTC+3)
 */

import { QATAR_TIMEZONE } from './qatar-timezone';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format a date to "10 Aug 2025" format in Qatar timezone
 * @param date - Date object, string, or null
 * @returns Formatted date string or fallback text
 */
export function formatDate(date: Date | string | null | undefined, fallback: string = 'N/A'): string {
  if (!date) return fallback;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return fallback;

  // Format in Qatar timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: QATAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(dateObj);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024');

  return `${day} ${MONTH_NAMES[month]} ${year}`;
}

/**
 * Format a date to "10 Aug 2025 14:30" format in Qatar timezone
 * @param date - Date object, string, or null
 * @returns Formatted datetime string or fallback text
 */
export function formatDateTime(date: Date | string | null | undefined, fallback: string = 'N/A'): string {
  if (!date) return fallback;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return fallback;

  // Format in Qatar timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: QATAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(dateObj);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024');
  const hours = parts.find(p => p.type === 'hour')?.value || '00';
  const minutes = parts.find(p => p.type === 'minute')?.value || '00';

  return `${day} ${MONTH_NAMES[month]} ${year} ${hours}:${minutes}`;
}

/**
 * Convert a Date to yyyy-MM-dd format for HTML date inputs
 * Uses Qatar timezone to ensure consistent date handling
 * @param date - Date object, string, or null
 * @returns ISO date string (yyyy-MM-dd) or empty string
 */
export function toInputDateString(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  // Format in Qatar timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: QATAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(dateObj);
  const year = parts.find(p => p.type === 'year')?.value || '2024';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';

  return `${year}-${month}-${day}`;
}

/**
 * Format date for CSV export (10 Aug 2025)
 * @param date - Date object, string, or null
 * @returns Formatted date string or empty string
 */
export function formatDateForCSV(date: Date | string | null | undefined): string {
  return formatDate(date, '');
}
