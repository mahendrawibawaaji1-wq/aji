import { TaskItem, DailyAlarm } from '../types';

/**
 * Safely format Date to local ISO Date string YYYY-MM-DD (avoiding UTC timezone shift)
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format Date to iCalendar UTC string format: YYYYMMDDTHHmmssZ
 */
function toIcsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generate Google Calendar Web Intent Link
 */
export function generateGoogleCalendarUrl(task: TaskItem): string {
  const title = encodeURIComponent(task.title);
  const details = encodeURIComponent(
    (task.description ? `${task.description}\n\n` : '') +
      `Prioritas: ${task.priority.toUpperCase()}\nKategori: ${task.category}\n` +
      (task.subtasks.length > 0
        ? `\nSubtugas:\n${task.subtasks.map((s) => `${s.completed ? '✓' : '○'} ${s.title}`).join('\n')}`
        : '') +
      `\nDibuat melalui Aplikasi AJI Harian`
  );

  // Determine start & end time
  const dateStr = task.dueDate || getLocalDateString();
  const timeStr = task.dueTime || task.alarmTime || '09:00';
  
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  const startDate = new Date(year, month - 1, day, hour, minute);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

  const startIso = toIcsTimestamp(startDate);
  const endIso = toIcsTimestamp(endDate);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${startIso}/${endIso}`;
}

/**
 * Generate standard .ics (iCalendar RFC 5545) content for a single task or array of tasks
 */
export function generateIcsFileContent(tasks: TaskItem[]): string {
  const now = toIcsTimestamp(new Date());

  const events = tasks.map((task) => {
    const dateStr = task.dueDate || getLocalDateString();
    const timeStr = task.dueTime || task.alarmTime || '09:00';
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);

    const startDate = new Date(year, month - 1, day, hour, minute);
    const endDate = new Date(startDate.getTime() + 45 * 60 * 1000);

    const dtStart = toIcsTimestamp(startDate);
    const dtEnd = toIcsTimestamp(endDate);
    const uid = `${task.id}-aji@app`;

    const summary = task.title.replace(/\n/g, ' ');
    const desc = (task.description ? `${task.description} ` : '') +
      `[Prioritas: ${task.priority}] [Kategori: ${task.category}]`;

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc.replace(/\n/g, '\\n')}`,
      `STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Pengingat Tugas: ${summary}`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AJI Daily Journal & Task//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:AJI - Daftar Tugas & Pengingat',
    'X-WR-TIMEZONE:Asia/Jakarta',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Trigger file download in browser
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/calendar') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Format currency in Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
