/**
 * User settings types and constants shared with client code.
 * Keep Prisma out of this module so it stays browser-safe.
 */

export interface UserSettings {
  maxThemes: number
  maxGatesPerTheme: number
  maxExperimentsPerTheme: number
  maxRoutinesPerTheme: number
  maxOpsPerTheme: number
  minCriteriaPerExperiment: number
  minCriteriaPerGate: number
  defaultSeasonWeeks: number
  defaultLagWeeks: number
  // Agent configuration
  agentBuiltinTools: string[]
  agentAllowedTools: string[]
  agentAllowBash: boolean
  agentPermissionMode: 'default' | 'acceptEdits' | 'bypassPermissions'
  agentSystemPrompt: string
  // Agent workitem integration
  agentWorkitemProvider: 'google_tasks' | 'none'
  agentWorkitemTools: string[]
  // Agent calendar tools
  agentCalendarTools: string[]
  agentCalendarDeleteEnabled: boolean
  agentCalendarDeleteAcknowledged: boolean
  // Email notifications
  emailDailySummary: boolean
  emailDailySummaryHour: number // 0-23, hour in user's local timezone
  emailWeeklyReview: boolean
  // Debug mode (FR-004)
  debugMode: boolean
  // Planning day (0=Sunday, 1=Monday, ..., 6=Saturday) - default Sunday
  planningDay: number
  // Onboarding progress
  onboarding_progress: OnboardingProgress
  onboarding_identity?: OnboardingIdentity
}

export type OnboardingStepStatus = 'pending' | 'completed' | 'skipped'

export interface OnboardingStepData {
  status: OnboardingStepStatus
  entityIds?: string[]
}

export interface OnboardingProgress {
  currentStep: number
  completedAt: string | null
  steps: Record<string, OnboardingStepData>
}

export interface OnboardingIdentity {
  seed: {
    coreIdentity: string
    startingPoint: string
    narrative: string
  }
  student: {
    becoming: string
    horizon: string
    narrative: string
  }
  gaze: {
    desires: string
    reflection: string
    nonNegotiables: string[]
  }
  kaizenExperiment?: Record<string, unknown>
}

// All available kaizen-db MCP tools
export const KAIZEN_DB_TOOLS = {
  'mcp__kaizen-db__list_cards': { name: 'List Cards', description: 'Query cards with filters', category: 'read' },
  'mcp__kaizen-db__get_card': { name: 'Get Card', description: 'Get a single card with children', category: 'read' },
  'mcp__kaizen-db__get_active_season': { name: 'Get Season', description: 'Get current active season', category: 'read' },
  'mcp__kaizen-db__get_recent_events': { name: 'Get Events', description: 'View recent activity', category: 'read' },
  'mcp__kaizen-db__list_cached_calendar_events': { name: 'List Cached Events', description: 'List cached calendar events for a week', category: 'read' },
  'mcp__kaizen-db__create_card': { name: 'Create Card', description: 'Create new cards', category: 'write' },
  'mcp__kaizen-db__update_card': { name: 'Update Card', description: 'Update card properties', category: 'write' },
  'mcp__kaizen-db__delete_card': { name: 'Delete Card', description: 'Delete cards', category: 'write' },
} as const

export type KaizenDbTool = keyof typeof KAIZEN_DB_TOOLS

// All available workitem MCP tools
export const WORKITEM_TOOLS = {
  'mcp__workitems__list_workitems': { name: 'List Tasks', description: 'List tasks in date range', category: 'read' },
  'mcp__workitems__get_workitem': { name: 'Get Task', description: 'Get a specific task by key', category: 'read' },
  'mcp__workitems__complete_workitem': { name: 'Complete Task', description: 'Mark a task as done', category: 'write' },
  'mcp__workitems__create_workitem': { name: 'Create Task', description: 'Create a new task', category: 'write' },
} as const

export type WorkitemTool = keyof typeof WORKITEM_TOOLS

// All available calendar MCP tools for agent
export const CALENDAR_TOOLS = {
  'mcp__calendar__create_calendar_event': { name: 'Create Event', description: 'Create calendar events', category: 'write' },
  'mcp__calendar__update_calendar_event': { name: 'Update Event', description: 'Update calendar events', category: 'write' },
  'mcp__calendar__delete_calendar_event': { name: 'Delete Event', description: 'Delete calendar events (destructive)', category: 'destructive' },
} as const

export type CalendarTool = keyof typeof CALENDAR_TOOLS

export const BUILT_IN_TOOLS = {
  'Read': { name: 'Read Files', description: 'Read file contents', category: 'builtin', safe: true },
  'Glob': { name: 'Glob Search', description: 'Find files by pattern', category: 'builtin', safe: true },
  'Grep': { name: 'Grep Search', description: 'Search file contents', category: 'builtin', safe: true },
  'Edit': { name: 'Edit Files', description: 'Edit file contents', category: 'builtin', safe: false },
  'Write': { name: 'Write Files', description: 'Create/overwrite files', category: 'builtin', safe: false },
} as const

// Default prompt placeholder - actual prompt loaded from file in server/routes/agent.ts
export const DEFAULT_AGENT_SYSTEM_PROMPT = ''

export const DEFAULT_USER_SETTINGS: UserSettings = {
  maxThemes: 4,
  maxGatesPerTheme: 2,
  maxExperimentsPerTheme: 1,
  maxRoutinesPerTheme: 5,
  maxOpsPerTheme: 3,
  minCriteriaPerExperiment: 2,
  minCriteriaPerGate: 1,
  defaultSeasonWeeks: 11,
  defaultLagWeeks: 6,
  // Default: safe built-ins + all read MCP tools
  agentBuiltinTools: ['Read', 'Glob', 'Grep'],
  agentAllowedTools: [
    'mcp__kaizen-db__list_cards',
    'mcp__kaizen-db__get_card',
    'mcp__kaizen-db__get_active_season',
    'mcp__kaizen-db__get_recent_events',
    'mcp__kaizen-db__list_cached_calendar_events',
  ],
  agentAllowBash: false,
  agentPermissionMode: 'acceptEdits',
  agentSystemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
  // Workitem integration - disabled by default
  agentWorkitemProvider: 'none',
  agentWorkitemTools: [],
  // Calendar tools - disabled by default (all tools must be explicitly enabled)
  agentCalendarTools: [],
  agentCalendarDeleteEnabled: false,
  agentCalendarDeleteAcknowledged: false,
  // Email notifications - enabled by default
  emailDailySummary: true,
  emailDailySummaryHour: 21, // 9 PM local
  emailWeeklyReview: true,
  // Debug mode off by default
  debugMode: false,
  // Planning day: 0=Sunday (default)
  planningDay: 0,
  onboarding_progress: {
    currentStep: 0,
    completedAt: null,
    steps: {},
  },
}

/**
 * Get user settings with defaults applied
 */
export function getUserSettings(userSettings: unknown): UserSettings {
  return { ...DEFAULT_USER_SETTINGS, ...(userSettings as Partial<UserSettings>) }
}
