/**
 * Weekly Review Reminder - Hourly cron handler.
 * Sends a review nudge email on each user's planning day at 9 AM local time.
 * Cron schedule: 30 * * * * (every hour at :30)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { DateTime } from 'https://esm.sh/luxon@3.4.4'
import { supabase } from '../_shared/db.ts'
import { sendEmail } from '../_shared/email.ts'
import { buildWeeklyReminderHtml } from '../_shared/templates.ts'

const REVIEW_HOUR = 9 // 9 AM local time

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
      const emailWeeklyReview = settings.emailWeeklyReview !== false // default true
      if (!emailWeeklyReview) {
        skipped++
        continue
      }

      const tz = user.timezone || 'America/Los_Angeles'
      const now = DateTime.now().setZone(tz)
      if (!now.isValid) {
        // Invalid timezone, skip
        skipped++
        continue
      }

      const localHour = now.hour
      const localDow = now.weekday % 7 // Luxon: 1=Mon..7=Sun → % 7 gives 0=Sun
      const localDateStr = now.toFormat('yyyy-MM-dd')

      const planningDay = settings.planningDay ?? 0
      if (localDow !== planningDay || localHour !== REVIEW_HOUR) {
        continue
      }

      // Check dedup: already sent today?
      const { data: existing } = await supabase
        .from('email_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('email_type', 'weekly_review_reminder')
        .eq('sent_date', localDateStr)
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      // Send email
      const html = buildWeeklyReminderHtml()
      const result = await sendEmail(
        user.email,
        'Time for your weekly review',
        html,
      )

      // Log result
      await supabase.from('email_log').insert({
        user_id: user.id,
        email_type: 'weekly_review_reminder',
        sent_date: localDateStr,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
      })

      if (result.success) {
        sent++
        console.log(`Weekly review reminder sent to user ${user.id}`)
      } else {
        console.error(`Failed to send weekly review to user ${user.id}: ${result.error}`)
      }
    }

    console.log(`Weekly review: sent=${sent}, skipped=${skipped}, total=${(users || []).length}`)
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (err) {
    console.error('Weekly review reminder error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500 },
    )
  }
})
