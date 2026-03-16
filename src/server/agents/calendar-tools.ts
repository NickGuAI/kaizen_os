import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { getCalendarToolDefinitions, CalendarToolContext } from './toolRegistry'

export type { CalendarToolContext } from './toolRegistry'

export function createCalendarTools(context: CalendarToolContext) {
  const tools = getCalendarToolDefinitions(context).map(definition => tool(
    definition.name,
    definition.description,
    definition.input,
    async (args) => definition.handler(args as Record<string, unknown>)
  ))

  return createSdkMcpServer({
    name: 'calendar',
    version: '1.0.0',
    tools,
  })
}
