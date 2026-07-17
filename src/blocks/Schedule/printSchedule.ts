import { weekdays } from '@/schedule/schedule-common'
import { buildCalendarGrid, formatHour } from './scheduleGrid'
import { ScheduleByDay } from './types'

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// A smaller, print-friendly scale than the on-screen calendar so a typical
// day's range fits comfortably on a landscape page.
const PRINT_PX_PER_MIN = 0.5
const PRINT_MIN_BLOCK_HEIGHT = 16

export const openPrintableCalendar = (scheduleByDay: ScheduleByDay): void => {
  const printWindow = window.open('', '_blank', 'width=1100,height=850')
  if (!printWindow) return

  const { rangeStart, totalMinutes, hourMarks, positionedByDay } = buildCalendarGrid(
    scheduleByDay,
    PRINT_PX_PER_MIN,
    PRINT_MIN_BLOCK_HEIGHT,
  )

  const bodyHeight = totalMinutes * PRINT_PX_PER_MIN

  const dayHeadersHtml = weekdays.map((day) => `<div class="day-header">${escapeHtml(day)}</div>`).join('')

  const hourLabelsHtml = hourMarks
    .map(
      (minutes) =>
        `<div class="hour-label" style="top:${(minutes - rangeStart) * PRINT_PX_PER_MIN}px">${escapeHtml(formatHour(minutes))}</div>`,
    )
    .join('')

  const dayColumnsHtml = weekdays
    .map((_, dayIndex) => {
      const hourLinesHtml = hourMarks
        .map(
          (minutes) =>
            `<div class="hour-line" style="top:${(minutes - rangeStart) * PRINT_PX_PER_MIN}px"></div>`,
        )
        .join('')

      const entriesHtml = positionedByDay[dayIndex]
        .map(
          (entry) => `
            <div class="entry" style="top:${entry.top}px;height:${entry.height}px">
              ${escapeHtml(entry.playlistName)}
            </div>`,
        )
        .join('')

      return `<div class="day-column" style="height:${bodyHeight}px">${hourLinesHtml}${entriesHtml}</div>`
    })
    .join('')

  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Sooke.live Schedule</title>
    <meta charset="utf-8" />
    <style>
      @page { size: landscape; margin: 1cm; }
      * { box-sizing: border-box; }
      body {
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        color: #000;
        background: #fff;
        margin: 1.5rem;
      }
      h1 {
        font-size: 1.25rem;
        margin-bottom: 1rem;
      }
      .grid {
        display: grid;
        grid-template-columns: 3.5rem repeat(7, 1fr);
      }
      .day-header {
        font-size: 0.75rem;
        font-weight: 600;
        text-align: center;
        padding-bottom: 0.25rem;
        border-bottom: 1px solid #000;
      }
      .hour-rail,
      .day-column {
        position: relative;
      }
      .hour-label {
        position: absolute;
        right: 0.5rem;
        font-size: 0.625rem;
        color: #444;
      }
      .day-column {
        border-left: 1px solid #ccc;
      }
      .hour-line {
        position: absolute;
        left: 0;
        right: 0;
        border-top: 1px dotted #ccc;
      }
      .entry {
        position: absolute;
        left: 2px;
        right: 2px;
        border: 1px solid #000;
        background: #f2f2f2;
        font-size: 0.625rem;
        font-weight: 600;
        padding: 1px 3px;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <h1>Sooke.live Weekly Schedule</h1>
    <div class="grid">
      <div></div>
      ${dayHeadersHtml}
      <div class="hour-rail" style="height:${bodyHeight}px">${hourLabelsHtml}</div>
      ${dayColumnsHtml}
    </div>
    <script>window.onload = function () { window.print(); };</script>
  </body>
</html>`)

  printWindow.document.close()
}
