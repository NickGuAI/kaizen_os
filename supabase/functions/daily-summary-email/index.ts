/**
 * Daily Summary Email - Hourly cron handler.
 * Sends end-of-day digest with theme hours, tasks completed, and focus items.
 * Cron schedule: 0 * * * * (every hour at :00)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { DateTime } from 'https://esm.sh/luxon@3.4.4'
import { supabase } from '../_shared/db.ts'
import { sendEmail } from '../_shared/email.ts'
import { buildDailySummaryHtml, type ThemeHours, type FocusItem } from '../_shared/templates.ts'

serve(async (req) => {
  // Fail closed: require CRON_SECRET in production
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) {
    console.error('CRON_SECRET not configured — rejecting request')
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 })
  }
  const authHeader = req.headers.get('authorization') || ''
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('id, email, timezone, settings')

    if (queryError) {
      console.error('Failed to query users:', queryError)
      return new Response(JSON.stringify({ error: queryError.message }), { status: 500 })
    }

    let sent = 0
    let skipped = 0

    for (const user of users || []) {
      const settings = user.settings || {}
      const emailDailySummary = settings.emailDailySummary !== false // default true
      if (!emailDailySummary) {
        skipped++
        continue
      }

      const tz = user.timezone || 'America/Los_Angeles'
      const summaryHour = settings.emailDailySummaryHour ?? 21
      const now = DateTime.now().setZone(tz)
      if (!now.isValid) {
        skipped++
        continue
      }

      const localHour = now.hour
      const localDateStr = now.toFormat('yyyy-MM-dd')
      const formattedDate = now.toFormat('cccc, MMM d')

      if (localHour !== summaryHour) {
        continue
      }

      // Check dedup
      const { data: existing } = await supabase
        .from('email_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('email_type', 'daily_summary')
        .eq('sent_date', localDateStr)
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      // Gather day's data

      // 1. Time logged events for today (event_type = 'time_logged')
      //    payload contains { minutes, cardId }
      //    Compute start/end of "today" in user's tz as UTC ISO strings
      const dayStart = now.startOf('day')
      const dayStartUtc = dayStart.toUTC().toISO()!
      const dayEndUtc = dayStart.plus({ days: 1 }).toUTC().toISO()!

      const { data: timeEvents } = await supabase
        .from('events')
        .select('payload, card_id')
        .eq('user_id', user.id)
        .eq('event_type', 'time_logged')
        .gte('occurred_at', dayStartUtc)
        .lt('occurred_at', dayEndUtc)

      // 2. Map card_id -> theme name (walk parent chain to THEME)
      const cardIds = [...new Set((timeEvents || []).map(e => e.card_id).filter(Boolean))]
      const themes: ThemeHours[] = []
      let totalHours = 0

      // Fetch cards only if there are card_ids to resolve
      const cardMap = new Map<string, { id: string; title: string; parent_id: string | null; unit_type: string }>()
      if (cardIds.length > 0) {
        const { data: allCards } = await supabase
          .from('cards')
          .select('id, title, parent_id, unit_type')
          .eq('user_id', user.id)

        for (const c of allCards || []) {
          cardMap.set(c.id, c)
        }
      }

      // Accumulate hours for ALL time events (including those without card_id)
      const themeHoursMap = new Map<string, number>()
      for (const event of timeEvents || []) {
        const minutes = parseFloat(event.payload?.minutes || '0')
        if (!minutes) continue
        const hours = minutes / 60
        totalHours += hours

        // Walk to parent THEME (falls back to 'Unlinked' if no card)
        let current = event.card_id ? cardMap.get(event.card_id) : null
        let themeName = 'Unlinked'
        while (current) {
          if (current.unit_type === 'THEME') {
            themeName = current.title
            break
          }
          current = current.parent_id ? cardMap.get(current.parent_id) : null
        }

        themeHoursMap.set(themeName, (themeHoursMap.get(themeName) || 0) + hours)
      }

      for (const [name, hours] of themeHoursMap) {
        themes.push({ name, hours })
      }
      themes.sort((a, b) => b.hours - a.hours)

      // 3. Daily focus items — batch query instead of N+1
      const { data: focusRow } = await supabase
        .from('daily_focus')
        .select('top_keys')
        .eq('user_id', user.id)
        .eq('date', localDateStr)
        .maybeSingle()

      const focusItems: FocusItem[] = []
      if (focusRow?.top_keys && Array.isArray(focusRow.top_keys)) {
        const keys = focusRow.top_keys as string[]
        const { data: workItems } = await supabase
          .from('work_item_links')
          .select('work_item_key, completed_in_event_key')
          .eq('user_id', user.id)
          .in('work_item_key', keys)

        const completionMap = new Map(
          (workItems || []).map(w => [w.work_item_key, !!w.completed_in_event_key])
        )

        for (const key of keys) {
          focusItems.push({
            title: key,
            completed: completionMap.get(key) ?? false,
          })
        }
      }

      // 4. Tasks completed today
      const { data: completedEvents } = await supabase
        .from('events')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_type', 'workitem_completed')
        .gte('occurred_at', dayStartUtc)
        .lt('occurred_at', dayEndUtc)

      const tasksCompleted = (completedEvents || []).length

      // Skip if no data at all
      if (totalHours === 0 && focusItems.length === 0 && tasksCompleted === 0) {
        await supabase.from('email_log').insert({
          user_id: user.id,
          email_type: 'daily_summary',
          sent_date: localDateStr,
          status: 'skipped_no_data',
        })
        skipped++
        continue
      }

      // Build and send
      const html = buildDailySummaryHtml({
        date: formattedDate,
        totalHours,
        themes,
        focusItems,
        tasksCompleted,
      })

      const result = await sendEmail(
        user.email,
        `Your Day — ${formattedDate}`,
        html,
      )

      await supabase.from('email_log').insert({
        user_id: user.id,
        email_type: 'daily_summary',
        sent_date: localDateStr,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
      })

      if (result.success) {
        sent++
        console.log(`Daily summary sent to user ${user.id}`)
      } else {
        console.error(`Failed to send daily summary to user ${user.id}: ${result.error}`)
      }
    }

    console.log(`Daily summary: sent=${sent}, skipped=${skipped}, total=${(users || []).length}`)
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (err) {
    console.error('Daily summary email error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500 },
    )
  }
})
