// Daily Notes API: per-day gratitude text and mindful moments checklist
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/db';
import { isValidLocalDate } from '../../utils/dateUtils';

const router = Router();

function createError(
  statusCode: number,
  code: string,
  message: string,
) {
  const error = new Error(message) as Error & {
    statusCode: number;
    code: string;
  };
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

// GET /api/daily-notes?date=YYYY-MM-DD
// Returns the daily note for a date, or empty defaults if none exists
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'date query parameter is required');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date must be in YYYY-MM-DD format');
    }
    if (!isValidLocalDate(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date is invalid');
    }

    const note = await prisma.dailyNote.findUnique({
      where: {
        userId_date: {
          userId: req.user!.id,
          date: new Date(date),
        },
      },
    });

    if (!note) {
      return res.json({
        date,
        gratitudeText: null,
        mindfulMeditated: false,
        mindfulSteppedAway: false,
        mindfulClosedGmail: false,
      });
    }

    res.json({
      date,
      gratitudeText: note.gratitudeText,
      mindfulMeditated: note.mindfulMeditated,
      mindfulSteppedAway: note.mindfulSteppedAway,
      mindfulClosedGmail: note.mindfulClosedGmail,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/daily-notes
// Upserts a daily note for a date (partial updates supported)
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, gratitudeText, mindfulMeditated, mindfulSteppedAway, mindfulClosedGmail } = req.body;

    if (!date || typeof date !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'date is required');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date must be in YYYY-MM-DD format');
    }
    if (!isValidLocalDate(date)) {
      throw createError(400, 'VALIDATION_ERROR', 'date is invalid');
    }

    const note = await prisma.dailyNote.upsert({
      where: {
        userId_date: {
          userId: req.user!.id,
          date: new Date(date),
        },
      },
      create: {
        userId: req.user!.id,
        date: new Date(date),
        gratitudeText: gratitudeText ?? null,
        mindfulMeditated: mindfulMeditated ?? false,
        mindfulSteppedAway: mindfulSteppedAway ?? false,
        mindfulClosedGmail: mindfulClosedGmail ?? false,
      },
      update: {
        ...(gratitudeText !== undefined && { gratitudeText }),
        ...(mindfulMeditated !== undefined && { mindfulMeditated }),
        ...(mindfulSteppedAway !== undefined && { mindfulSteppedAway }),
        ...(mindfulClosedGmail !== undefined && { mindfulClosedGmail }),
      },
    });

    res.json({
      date,
      gratitudeText: note.gratitudeText,
      mindfulMeditated: note.mindfulMeditated,
      mindfulSteppedAway: note.mindfulSteppedAway,
      mindfulClosedGmail: note.mindfulClosedGmail,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
