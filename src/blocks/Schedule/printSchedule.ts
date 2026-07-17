import { weekdays, formatTime } from '@/schedule/schedule-common'
import { ScheduleByDay } from './types'

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const openPrintableSchedule = (scheduleByDay: ScheduleByDay): void => {
  const printWindow = window.open('', '_blank', 'width=800,height=1000')
  if (!printWindow) return

  const daysHtml = weekdays
    .map((day, dayIndex) => {
      const entries = (scheduleByDay[dayIndex] || []).slice().sort((a, b) => a.startTime - b.startTime)

      const entriesHtml = entries.length
        ? entries
            .map(
              (entry) => `
                <div class="entry">
                  <span class="time">${escapeHtml(formatTime(entry.startTime))} - ${escapeHtml(formatTime(entry.endTime))}</span>
                  <span class="name">${escapeHtml(entry.playlistName)}</span>
                </div>`,
            )
            .join('')
        : '<div class="empty">No shows scheduled</div>'

      return `
        <section class="day">
          <h2>${escapeHtml(day)}</h2>
          ${entriesHtml}
        </section>`
    })
    .join('')

  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Sooke.live Schedule</title>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        color: #000;
        background: #fff;
        margin: 2rem;
      }
      h1 {
        font-size: 1.5rem;
        margin-bottom: 1.5rem;
      }
      .day {
        break-inside: avoid;
        margin-bottom: 1.25rem;
      }
      .day h2 {
        font-size: 1rem;
        border-bottom: 1px solid #000;
        padding-bottom: 0.25rem;
        margin-bottom: 0.5rem;
      }
      .entry {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
        padding: 0.15rem 0;
        border-bottom: 1px dotted #ccc;
      }
      .time {
        min-width: 11rem;
      }
      .name {
        font-weight: 600;
      }
      .empty {
        font-style: italic;
        color: #555;
        font-size: 0.875rem;
      }
    </style>
  </head>
  <body>
    <h1>Sooke.live Weekly Schedule</h1>
    ${daysHtml}
    <script>window.onload = function () { window.print(); };</script>
  </body>
</html>`)

  printWindow.document.close()
}
