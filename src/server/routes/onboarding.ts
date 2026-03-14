import { Router, Request, Response } from 'express'
import { prisma } from '../../lib/db'
import { subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { callGemini } from '../../services/ai/geminiService'

const router = Router()

// Configuration constants
const CALENDAR_ANALYSIS_MONTHS = 3
const MAX_CALENDAR_EVENTS = 500
const MAX_CATEGORY_SUGGESTIONS = 5
const MAX_RECURRING_PATTERNS = 10
const MAX_RECENT_EVENTS_SAMPLE = 20
const MIN_RECURRING_COUNT = 3

interface CalendarEvent {
  id: string
  summary: string | null
  description: string | null
  startDateTime: Date
  endDateTime: Date
  isAllDay: boolean
  recurringEventId: string | null
}

interface SuggestedTheme {
  id: string
  name: string
  description: string
  icon: string
}

interface SuggestedGate {
  id: string
  title: string
  theme: string
  deadline: string
  criteria?: string[]
}

interface SuggestedRoutine {
  id: string
  title: string
  frequency: string
  theme: string
}

interface Suggestions {
  themes: SuggestedTheme[]
  gates: SuggestedGate[]
  routines: SuggestedRoutine[]
}

/**
 * Analyze calendar events to extract patterns
 */
function analyzeCalendarPatterns(events: CalendarEvent[]): {
  recurringPatterns: Map<string, { count: number; summary: string }>
  categories: Map<string, number>
  keywords: Map<string, number>
} {
  const recurringPatterns = new Map<string, { count: number; summary: string }>()
  const categories = new Map<string, number>()
  const keywords = new Map<string, number>()

  // Common category keywords
  const categoryKeywords: Record<string, string[]> = {
    'Health & Wellness': ['gym', 'workout', 'doctor', 'dentist', 'therapy', 'yoga', 'meditation', 'health', 'fitness', 'run', 'exercise'],
    'Career & Work': ['meeting', 'standup', 'review', 'interview', '1:1', 'sync', 'presentation', 'deadline', 'project', 'work'],
    'Relationships': ['dinner', 'lunch', 'coffee', 'family', 'birthday', 'anniversary', 'date', 'friends', 'call with'],
    'Personal Growth': ['class', 'course', 'learn', 'study', 'read', 'workshop', 'training', 'conference', 'mentor'],
    'Finance': ['bank', 'tax', 'financial', 'budget', 'investment', 'accountant', 'bills'],
    'Life Admin': ['appointment', 'errand', 'service', 'repair', 'maintenance', 'car', 'house'],
  }

  for (const event of events) {
    const summary = (event.summary || '').toLowerCase()

    // Track recurring events
    if (event.recurringEventId) {
      const existing = recurringPatterns.get(event.recurringEventId)
      if (existing) {
        existing.count++
      } else {
        recurringPatterns.set(event.recurringEventId, { count: 1, summary: event.summary || '' })
      }
    }

    // Categorize events
    for (const [category, words] of Object.entries(categoryKeywords)) {
      if (words.some(word => summary.includes(word))) {
        categories.set(category, (categories.get(category) || 0) + 1)
      }
    }

    // Extract keywords
    const words = summary.split(/\s+/).filter(w => w.length > 3)
    for (const word of words) {
      keywords.set(word, (keywords.get(word) || 0) + 1)
    }
  }

  return { recurringPatterns, categories, keywords }
}

/**
 * Parse and validate Gemini API response
 */
function parseGeminiResponse(content: string): Suggestions {
  // Extract JSON from potential markdown wrapper
  let jsonText = content || '{}'
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonText = jsonMatch[1]
  }

  const suggestions = JSON.parse(jsonText)

  // Validate structure
  if (!suggestions || typeof suggestions !== 'object') {
    return { themes: [], gates: [], routines: [] }
  }

  return {
    themes: Array.isArray(suggestions.themes) ? suggestions.themes : [],
    gates: Array.isArray(suggestions.gates) ? suggestions.gates : [],
    routines: Array.isArray(suggestions.routines) ? suggestions.routines : [],
  }
}

/**
 * Generate suggestions using Gemini API
 */
async function generateSuggestionsWithGemini(
  calendarSummary: string,
  journalContent: string | null
): Promise<Suggestions> {
  const prompt = `You are helping a user set up their personal productivity system. Based on the data provided, suggest personalized themes (life areas), gates (commitments/goals), and routines.

${calendarSummary ? `Calendar Analysis (last ${CALENDAR_ANALYSIS_MONTHS} months):
${calendarSummary}` : ''}

${journalContent ? `User's Journal/Reflections:
${journalContent}` : ''}

Generate suggestions in JSON format. Be specific and personalized based on the data.
- Themes: 2-4 life areas that appear important based on their calendar/reflections
- Gates: 1-3 specific commitments they should focus on (with deadlines if apparent)
- Routines: 2-4 regular practices they already do or should establish

Response format (valid JSON only, no markdown code blocks):
{
  "themes": [
    { "id": "t1", "name": "Theme Name", "description": "Brief description", "icon": "emoji" }
  ],
  "gates": [
    { "id": "g1", "title": "Goal title", "theme": "Related Theme Name", "deadline": "YYYY-MM-DD (ISO format only, e.g., 2026-03-15)", "criteria": ["criterion 1", "criterion 2"] }
  ],
  "routines": [
    { "id": "r1", "title": "Routine name", "frequency": "Daily/Weekly/etc", "theme": "Related Theme Name" }
  ]
}`

  const responseText = await callGemini(prompt)
  return parseGeminiResponse(responseText)
}

/**
 * @openapi
 * /api/onboarding/generate-suggestions:
 *   post:
 *     summary: Generate personalized onboarding suggestions
 *     tags:
 *       - Onboarding
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               journalText:
 *                 type: string
 *                 description: User's journal or reflection text
 *     responses:
 *       200:
 *         description: Generated suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 themes:
 *                   type: array
 *                 gates:
 *                   type: array
 *                 routines:
 *                   type: array
 */
router.post('/generate-suggestions', async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { journalText } = req.body

  try {
    // Get calendar events from the last N months with limit
    const now = new Date()
    const analysisStart = startOfMonth(subMonths(now, CALENDAR_ANALYSIS_MONTHS))
    const endDate = endOfMonth(now)

    const events = await prisma.cachedCalendarEvent.findMany({
      where: {
        userId,
        startDateTime: { gte: analysisStart, lte: endDate },
      },
      orderBy: { startDateTime: 'asc' },
      take: MAX_CALENDAR_EVENTS,
    })

    // Analyze calendar patterns
    const { recurringPatterns, categories } = analyzeCalendarPatterns(
      events.map(e => ({
        id: e.id,
        summary: e.summary,
        description: e.description,
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime,
        isAllDay: e.isAllDay,
        recurringEventId: e.recurringEventId,
      }))
    )

    // Build calendar summary for Claude
    let calendarSummary = ''
    if (events.length > 0) {
      calendarSummary = `Total events analyzed: ${events.length}\n\n`

      // Top categories
      const sortedCategories = [...categories.entries()].sort((a, b) => b[1] - a[1])
      if (sortedCategories.length > 0) {
        calendarSummary += 'Event categories detected:\n'
        for (const [cat, count] of sortedCategories.slice(0, MAX_CATEGORY_SUGGESTIONS)) {
          calendarSummary += `- ${cat}: ${count} events\n`
        }
        calendarSummary += '\n'
      }

      // Recurring patterns
      const sortedRecurring = [...recurringPatterns.values()]
        .filter(p => p.count >= MIN_RECURRING_COUNT)
        .sort((a, b) => b.count - a.count)
      if (sortedRecurring.length > 0) {
        calendarSummary += 'Recurring events (weekly or more):\n'
        for (const pattern of sortedRecurring.slice(0, MAX_RECURRING_PATTERNS)) {
          calendarSummary += `- "${pattern.summary}" (${pattern.count} occurrences)\n`
        }
        calendarSummary += '\n'
      }

      // Sample recent events
      const recentSample = events.slice(-MAX_RECENT_EVENTS_SAMPLE).map(e => e.summary).filter(Boolean)
      if (recentSample.length > 0) {
        calendarSummary += 'Sample recent events:\n'
        for (const summary of recentSample) {
          calendarSummary += `- ${summary}\n`
        }
      }
    }

    // Generate suggestions with Gemini
    const suggestions = await generateSuggestionsWithGemini(
      calendarSummary,
      journalText || null
    )

    res.json(suggestions)
  } catch (err) {
    console.error('Failed to generate suggestions:', err)
    const message = err instanceof Error ? err.message : 'Failed to generate suggestions'

    // Return 503 for API configuration errors, 500 for others
    if (message.includes('not configured')) {
      res.status(503).json({ error: message })
    } else {
      res.status(500).json({ error: 'Failed to generate suggestions' })
    }
  }
})

export default router
