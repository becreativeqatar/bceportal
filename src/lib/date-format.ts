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
 * Parses date strings WITHOUT timezone conversion to prevent date shifting
 * @param date - Date object, string, or null
 * @returns ISO date string (yyyy-MM-dd) or empty string
 */
export function toInputDateString(date: Date | string | null | undefined): string {
  if (!date) return '';

  // If it's already a yyyy-mm-dd string, return it as-is
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return date;
  }

  // If it's an ISO string with time, extract just the date part
  if (typeof date === 'string' && date.includes('T')) {
    return date.split('T')[0];
  }

  // For Date objects or other string formats
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  // Use UTC methods to avoid timezone shifts
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Parse a yyyy-mm-dd string to a Date object at UTC midnight
 * This prevents timezone shifts when storing dates
 * @param dateString - Date string in yyyy-mm-dd format
 * @returns Date object at UTC midnight or null
 */
export function parseInputDateString(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  // Check if it's yyyy-mm-dd format
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return null;

  // Parse as UTC midnight to avoid timezone shifts
  // Add 'T00:00:00.000Z' to force UTC parsing
  const isoString = `${dateString}T00:00:00.000Z`;
  const date = new Date(isoString);

  return isNaN(date.getTime()) ? null : date;
}

/**
 * Format date for CSV export (10 Aug 2025)
 * @param date - Date object, string, or null
 * @returns Formatted date string or empty string
 */
export function formatDateForCSV(date: Date | string | null | undefined): string {
  return formatDate(date, '');
}
