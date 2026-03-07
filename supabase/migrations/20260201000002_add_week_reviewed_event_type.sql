-- Add week_reviewed event type for tracking weekly review completion
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'week_reviewed' AFTER 'week_planned';
