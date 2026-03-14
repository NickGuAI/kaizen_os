// Tags API Routes
// Handles event tags for Tag Mode feature

import { Router, Request, Response } from 'express'
import prisma from '../../lib/db'
import { DEFAULT_TAGS } from '../../utils/tagConfig'

const router = Router()
/**
 * @openapi
 * /api/tags/config:
 *   get:
 *     summary: Get tag configuration
 *     tags:
 *       - Tags
 *     responses:
 *       200:
 *         description: Tag definitions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/tags/events:
 *   get:
 *     summary: List event tags
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: query
 *         name: eventIds
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated event IDs
 *     responses:
 *       200:
 *         description: Event tags
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 *   post:
 *     summary: Upsert tag for an event
 *     tags:
 *       - Tags
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               tagType:
 *                 type: string
 *               tagValue:
 *                 type: string
 *             required:
 *               - eventId
 *               - tagType
 *               - tagValue
 *     responses:
 *       200:
 *         description: Updated tag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/tags/events/{eventId}/{tagType}:
 *   delete:
 *     summary: Remove tag from an event
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tagType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tag removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/tags/stats:
 *   get:
 *     summary: Get tag stats
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: query
 *         name: weekStart
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: seasonStart
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: seasonEnd
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tag statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 */
// GET /api/tags/config - Get available tag definitions
router.get('/config', (_req: Request, res: Response) => {
  res.json(DEFAULT_TAGS)
})

// GET /api/tags/events - Get all event tags for user (optionally filtered by eventIds)
router.get('/events', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const eventIds = req.query.eventIds
      ? String(req.query.eventIds).split(',')
      : undefined

    const where: { userId: string; eventId?: { in: string[] } } = { userId }
    if (eventIds) {
      where.eventId = { in: eventIds }
    }

    const tags = await prisma.eventTag.findMany({ where })
    res.json(tags)
  } catch (error) {
    console.error('Failed to fetch event tags:', error)
    res.status(500).json({ error: 'Failed to fetch event tags' })
  }
})

// POST /api/tags/events - Set tag for an event (upsert)
router.post('/events', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { eventId, tagType, tagValue } = req.body

    if (!eventId || !tagType || !tagValue) {
      return res
        .status(400)
        .json({ error: 'eventId, tagType, and tagValue are required' })
    }

    const tag = await prisma.eventTag.upsert({
      where: {
        userId_eventId_tagType: { userId, eventId, tagType },
      },
      update: { tagValue, updatedAt: new Date() },
      create: { userId, eventId, tagType, tagValue },
    })

    res.json(tag)
  } catch (error) {
    console.error('Failed to set event tag:', error)
    res.status(500).json({ error: 'Failed to set event tag' })
  }
})

// DELETE /api/tags/events/:eventId/:tagType - Remove tag from event
router.delete('/events/:eventId/:tagType', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { eventId, tagType } = req.params as { eventId: string; tagType: string }

    await prisma.eventTag.deleteMany({
      where: { userId, eventId, tagType },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete event tag:', error)
    res.status(500).json({ error: 'Failed to delete event tag' })
  }
})

// GET /api/tags/stats - Get tag statistics for a week or date range
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const weekStart = req.query.weekStart as string
    const seasonStart = req.query.seasonStart as string
    const seasonEnd = req.query.seasonEnd as string

    let startDate: Date
    let endDate: Date

    if (seasonStart && seasonEnd) {
      // Season view - use provided date range
      startDate = new Date(seasonStart)
      endDate = new Date(seasonEnd)
    } else if (weekStart) {
      // Week view - calculate week end
      startDate = new Date(weekStart)
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 7)
    } else {
      return res.status(400).json({ error: 'weekStart or seasonStart/seasonEnd is required' })
    }

    // Get cached events for the date range to calculate hours
    // Exclude all-day events (can't be tagged, each = 24h) and
    // [Kaizen] plan-created events (duplicate time of original events)
    const cachedEvents = await prisma.cachedCalendarEvent.findMany({
      where: {
        userId,
        isAllDay: false,
        startDateTime: { gte: startDate },
        endDateTime: { lt: endDate },
        NOT: { summary: { startsWith: '[Kaizen]' } },
      },
    })

    // Deduplicate by eventId (same event can appear in multiple calendars)
    const seenEventIds = new Set<string>()
    const uniqueEvents = cachedEvents.filter((e) => {
      if (seenEventIds.has(e.eventId)) return false
      seenEventIds.add(e.eventId)
      return true
    })

    // Get event tags for these events
    const eventIds = uniqueEvents.map((e) => e.eventId)
    const eventTags = await prisma.eventTag.findMany({
      where: {
        userId,
        eventId: { in: eventIds },
      },
    })

    // Build eventId -> tags map
    const tagsByEvent = new Map<string, Record<string, string>>()
    for (const tag of eventTags) {
      if (!tagsByEvent.has(tag.eventId)) {
        tagsByEvent.set(tag.eventId, {})
      }
      tagsByEvent.get(tag.eventId)![tag.tagType] = tag.tagValue
    }

    // Calculate stats per tag type
    const stats: Record<
      string,
      { byValue: Record<string, number>; untagged: number; total: number }
    > = {}

    // Initialize stats for each tag type
    for (const tagDef of DEFAULT_TAGS) {
      stats[tagDef.name] = {
        byValue: {},
        untagged: 0,
        total: 0,
      }
      for (const val of tagDef.values) {
        stats[tagDef.name].byValue[val.value] = 0
      }
    }

    // Aggregate hours by tag value
    for (const event of uniqueEvents) {
      const durationHours =
        (event.endDateTime.getTime() - event.startDateTime.getTime()) /
        (1000 * 60 * 60)
      const eventTagsMap = tagsByEvent.get(event.eventId) || {}

      for (const tagDef of DEFAULT_TAGS) {
        stats[tagDef.name].total += durationHours
        const tagValue = eventTagsMap[tagDef.name]
        if (tagValue && stats[tagDef.name].byValue[tagValue] !== undefined) {
          stats[tagDef.name].byValue[tagValue] += durationHours
        } else {
          stats[tagDef.name].untagged += durationHours
        }
      }
    }

    // Round values
    for (const tagName of Object.keys(stats)) {
      stats[tagName].total = Math.round(stats[tagName].total * 10) / 10
      stats[tagName].untagged = Math.round(stats[tagName].untagged * 10) / 10
      for (const val of Object.keys(stats[tagName].byValue)) {
        stats[tagName].byValue[val] =
          Math.round(stats[tagName].byValue[val] * 10) / 10
      }
    }

    res.json(stats)
  } catch (error) {
    console.error('Failed to fetch tag stats:', error)
    res.status(500).json({ error: 'Failed to fetch tag stats' })
  }
})

export default router
