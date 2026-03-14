import prisma from '../lib/db'
import {
  BUILT_IN_TOOLS,
  DEFAULT_AGENT_SYSTEM_PROMPT,
  DEFAULT_USER_SETTINGS,
  KAIZEN_DB_TOOLS,
  WORKITEM_TOOLS,
  type KaizenDbTool,
  type UserSettings,
  type WorkitemTool,
} from './userSettingsTypes'

export { BUILT_IN_TOOLS, DEFAULT_AGENT_SYSTEM_PROMPT, DEFAULT_USER_SETTINGS, KAIZEN_DB_TOOLS, WORKITEM_TOOLS }
export type { KaizenDbTool, UserSettings, WorkitemTool }

export const userService = {
  async getSettings(userId: string): Promise<UserSettings> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return {
      ...DEFAULT_USER_SETTINGS,
      ...(user.settings as unknown as Partial<UserSettings>),
    }
  },

  async updateSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    const currentSettings = await this.getSettings(userId)
    const newSettings = { ...currentSettings, ...settings }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        settings: newSettings as unknown as Parameters<typeof prisma.user.update>[0]['data']['settings'],
      },
    })

    return user.settings as unknown as UserSettings
  },
}
