import { Router, Request, Response, NextFunction } from 'express';
import {
  getWorkItemsForDay,
  getParkingLotItems,
  parkWorkItem,
  linkWorkItem,
  unlinkWorkItem,
  setDailyFocus,
  getDailyFocus,
  completeWorkItem,
  createWorkItem,
  reorderPlaylist,
  moveWorkItemToDate,
} from '../../services/workitems/workItemService';
import { getUserTimezone, isValidLocalDate } from '../../utils/dateUtils';

const router = Router();

/**
 * @openapi
 * /api/workitems/day:
 *   get:
 *     summary: List work items for a day
 *     tags:
 *       - Workitems
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Work items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/workitems/link:
 *   post:
 *     summary: Link a work item to a card
 *     tags:
 *       - Workitems
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workItemKey:
 *                 type: string
 *               cardId:
 *                 type: number
 *                 nullable: true
 *             required:
 *               - workItemKey
 *     responses:
 *       200:
 *         description: Link result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/workitems/link/{workItemKey}:
 *   delete:
 *     summary: Unlink a work item
 *     tags:
 *       - Workitems
 *     parameters:
 *       - in: path
 *         name: workItemKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Link removed
 * /api/workitems/focus:
 *   get:
 *     summary: Get daily focus
 *     tags:
 *       - Workitems
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Daily focus
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *   post:
 *     summary: Set daily focus
 *     tags:
 *       - Workitems
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *               topKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - date
 *               - topKeys
 *     responses:
 *       200:
 *         description: Focus updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/workitems/complete:
 *   post:
 *     summary: Complete a work item
 *     tags:
 *       - Workitems
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workItemKey:
 *                 type: string
 *               completedInEventKey:
 *                 type: string
 *             required:
 *               - workItemKey
 *     responses:
 *       200:
 *         description: Completion recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/workitems/create:
 *   post:
 *     summary: Create a work item
 *     tags:
 *       - Workitems
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               dueAt:
 *                 type: string
 *               notes:
 *                 type: string
 *               source:
 *                 type: string
 *               capturedInEventKey:
 *                 type: string
 *               cardId:
 *                 type: number
 *             required:
 *               - title
 *     responses:
 *       200:
 *         description: Created work item
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 */

// Helper to create API errors
function createError(
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, string[]>
) {
  const error = new Error(message) as Error & {
    statusCode: number;
    code: string;
    details?: Record<string, string[]>;
  };
  error.statusCode = statusCode;
  error.code = code;
  if (details) error.details = details;
  return error;
}

// GET /api/workitems/day?date=YYYY-MM-DD
// Returns WorkItem[] with overlays (linkedCardId, linkedCardTitle, focusRank)
router.get('/day', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'date query parameter is required');
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date must be in YYYY-MM-DD format');
    }
    if (!isValidLocalDate(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date is invalid');
    }

    const timezone = getUserTimezone(req.user ?? null);
    const workItems = await getWorkItemsForDay(req.user!.id, date, timezone);
    res.json(workItems);
  } catch (error) {
    next(error);
  }
});

// POST /api/workitems/link
// Body: { workItemKey: string, cardId: string | null }
// Links a WorkItem to a Card (or unlinks if cardId is null)
router.post('/link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workItemKey, cardId } = req.body;

    if (!workItemKey || typeof workItemKey !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'workItemKey is required');
    }

    if (cardId !== null && typeof cardId !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'cardId must be a string or null');
    }

    await linkWorkItem(req.user!.id, workItemKey, cardId);
    res.json({ success: true, workItemKey, cardId });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/workitems/link/:workItemKey
// Removes a WorkItem link entirely
router.delete(
  '/link/:workItemKey(*)',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workItemKey = req.params.workItemKey as string;

      if (!workItemKey) {
        throw createError(400, 'VALIDATION_ERROR', 'workItemKey is required');
      }

      await unlinkWorkItem(workItemKey);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/workitems/focus
// Body: { date: string, topKeys: string[] }
// Sets the Top 3 focus items for a day
router.post('/focus', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, topKeys } = req.body;

    if (!date || typeof date !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'date is required');
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date must be in YYYY-MM-DD format');
    }
    if (!isValidLocalDate(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date is invalid');
    }

    if (!Array.isArray(topKeys)) {
      throw createError(400, 'VALIDATION_ERROR', 'topKeys must be an array');
    }

    if (topKeys.length > 3) {
      throw createError(400, 'VALIDATION_ERROR', 'topKeys can have at most 3 items');
    }

    if (!topKeys.every((k) => typeof k === 'string')) {
      throw createError(400, 'VALIDATION_ERROR', 'topKeys must contain strings');
    }

    await setDailyFocus(req.user!.id, date, topKeys);
    res.json({ success: true, date, topKeys });
  } catch (error) {
    next(error);
  }
});

// GET /api/workitems/focus?date=YYYY-MM-DD
// Gets the daily focus for a date
router.get('/focus', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'date query parameter is required');
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date must be in YYYY-MM-DD format');
    }
    if (!isValidLocalDate(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date is invalid');
    }

    const focus = await getDailyFocus(req.user!.id, date);
    if (!focus) {
      return res.json({ date, topKeys: [] });
    }

    res.json({ date, topKeys: focus.topKeys });
  } catch (error) {
    next(error);
  }
});

// POST /api/workitems/complete
// Body: { workItemKey: string, completedInEventKey?: string }
// Marks a work item as complete in the provider and records ledger event
router.post('/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workItemKey, completedInEventKey } = req.body;

    if (!workItemKey || typeof workItemKey !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'workItemKey is required');
    }

    if (completedInEventKey && typeof completedInEventKey !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'completedInEventKey must be a string');
    }

    await completeWorkItem(req.user!.id, workItemKey, completedInEventKey);
    res.json({ success: true, workItemKey, completedInEventKey });
  } catch (error) {
    next(error);
  }
});

// POST /api/workitems/create
// Body: { title: string, dueAt?: string, notes?: string, source?: string, capturedInEventKey?: string, cardId?: string }
// Creates a new work item in the specified provider (defaults to Google Tasks)
// If cardId is provided, auto-links the task to that action card
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, dueAt, notes, source, capturedInEventKey, cardId } = req.body;

    if (!title || typeof title !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'title is required');
    }

    if (dueAt && typeof dueAt !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'dueAt must be a string');
    }

    if (notes && typeof notes !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'notes must be a string');
    }

    if (capturedInEventKey && typeof capturedInEventKey !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'capturedInEventKey must be a string');
    }

    if (cardId !== undefined && typeof cardId !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'cardId must be a string');
    }

    const workItem = await createWorkItem(req.user!.id, {
      title,
      dueAt,
      notes,
      source,
      capturedInEventKey,
      cardId,
    });

    res.json(workItem);
  } catch (error) {
    next(error);
  }
});

// POST /api/workitems/playlist/reorder
// Body: { date: string, orderedKeys: string[] }
// Reorders playlist items for a day by assigning sequential playlistRank values
router.post('/playlist/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, orderedKeys } = req.body;

    if (!date || typeof date !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'date is required');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date must be in YYYY-MM-DD format');
    }
    if (!isValidLocalDate(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date is invalid');
    }

    if (!Array.isArray(orderedKeys)) {
      throw createError(400, 'VALIDATION_ERROR', 'orderedKeys must be an array');
    }

    if (!orderedKeys.every((k) => typeof k === 'string')) {
      throw createError(400, 'VALIDATION_ERROR', 'orderedKeys must contain strings');
    }

    await reorderPlaylist(req.user!.id, date, orderedKeys);
    res.json({ success: true, date, orderedKeys });
  } catch (error) {
    next(error);
  }
});

// POST /api/workitems/move
// Body: { workItemKey: string, newDate: string }
// Moves a work item to a new date, resetting its playlistRank
router.post('/move', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workItemKey, newDate } = req.body;

    if (!workItemKey || typeof workItemKey !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'workItemKey is required');
    }

    if (!newDate || typeof newDate !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'newDate is required');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      throw createError(400, 'VALIDATION_ERROR', 'newDate must be in YYYY-MM-DD format');
    }
    if (!isValidLocalDate(newDate)) {
      throw createError(400, 'VALIDATION_ERROR', 'newDate is invalid');
    }

    await moveWorkItemToDate(req.user!.id, workItemKey, newDate);
    res.json({ success: true, workItemKey, newDate });
  } catch (error) {
    next(error);
  }
});

// GET /api/workitems/parking
// Returns all parking lot items (WorkItemLink where plannedForDate IS NULL)
router.get('/parking', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await getParkingLotItems(req.user!.id);
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// POST /api/workitems/park
// Body: { workItemKey: string }
// Moves a work item to the parking lot (clears plannedForDate)
router.post('/park', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workItemKey } = req.body;

    if (!workItemKey || typeof workItemKey !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'workItemKey is required');
    }

    await parkWorkItem(req.user!.id, workItemKey);
    res.json({ success: true, workItemKey });
  } catch (error) {
    next(error);
  }
});

export default router;
