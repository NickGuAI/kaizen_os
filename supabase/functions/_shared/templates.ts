/**
 * Email HTML templates for daily summary and weekly review reminder.
 */

const APP_URL = Deno.env.get('APP_URL')
if (!APP_URL) {
  console.warn('APP_URL not set — email links will be broken')
}
const appUrl = APP_URL || 'https://app.example.com'

/** Escape HTML special characters to prevent injection. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
  .header { padding: 24px 32px; background: #1a1a2e; color: #fff; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
  .header p { margin: 4px 0 0; font-size: 13px; color: #a0a0b0; }
  .body { padding: 24px 32px; }
  .stat { display: inline-block; text-align: center; padding: 16px; background: #f8f9fa; border-radius: 8px; margin-right: 12px; margin-bottom: 12px; }
  .stat-value { font-size: 28px; font-weight: 700; color: #1a1a2e; }
  .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  .section { margin-top: 20px; }
  .section h2 { font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; }
  .theme-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  .focus-item { padding: 4px 0; font-size: 14px; }
  .focus-done { color: #22c55e; }
  .focus-pending { color: #888; }
  .footer { padding: 16px 32px; font-size: 11px; color: #aaa; border-top: 1px solid #f0f0f0; }
  .btn { display: inline-block; padding: 12px 24px; background: #1a1a2e; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; }
`

function wrap(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${STYLES}</style></head>
<body><div style="padding:16px"><div class="container">${content}</div></div></body></html>`
}

export interface ThemeHours {
  name: string
  hours: number
}

export interface FocusItem {
  title: string
  completed: boolean
}

export interface DailySummaryData {
  date: string // formatted like "Wednesday, Jan 29"
  totalHours: number
  themes: ThemeHours[]
  focusItems: FocusItem[]
  tasksCompleted: number
}

export function buildDailySummaryHtml(data: DailySummaryData): string {
  const themesHtml = data.themes.length > 0
    ? data.themes.map(t =>
      `<div class="theme-row"><span>${escapeHtml(t.name)}</span><span style="font-weight:600">${t.hours.toFixed(1)}h</span></div>`
    ).join('')
    : '<p style="font-size:13px;color:#888">No time logged today.</p>'

  const focusHtml = data.focusItems.length > 0
    ? data.focusItems.map(f =>
      `<div class="focus-item ${f.completed ? 'focus-done' : 'focus-pending'}">${f.completed ? '&#10003;' : '&#9675;'} ${escapeHtml(f.title)}</div>`
    ).join('')
    : '<p style="font-size:13px;color:#888">No focus items set.</p>'

  return wrap(`
    <div class="header">
      <h1>Your Day</h1>
      <p>${escapeHtml(data.date)}</p>
    </div>
    <div class="body">
      <div>
        <div class="stat">
          <div class="stat-value">${data.totalHours.toFixed(1)}</div>
          <div class="stat-label">Hours Logged</div>
        </div>
        <div class="stat">
          <div class="stat-value">${data.tasksCompleted}</div>
          <div class="stat-label">Tasks Done</div>
        </div>
      </div>

      <div class="section">
        <h2>Theme Breakdown</h2>
        ${themesHtml}
      </div>

      <div class="section">
        <h2>Focus Items</h2>
        ${focusHtml}
      </div>
    </div>
    <div class="footer">
      <a href="${appUrl}/settings" style="color:#888">Manage email preferences</a>
    </div>
  `)
}

export function buildWeeklyReminderHtml(): string {
  return wrap(`
    <div class="header">
      <h1>Time for Your Weekly Review</h1>
      <p>Stay on track with your themes and goals</p>
    </div>
    <div class="body">
      <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 20px">
        Take a few minutes to review your past week and plan ahead.
        Check your theme progress, update experiments, and set focus items for the week.
      </p>
      <a href="${appUrl}/review" class="btn">Start Review &rarr;</a>
    </div>
    <div class="footer">
      <a href="${appUrl}/settings" style="color:#888">Manage email preferences</a>
    </div>
  `)
}
