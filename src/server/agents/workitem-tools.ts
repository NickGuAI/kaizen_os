import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { getWorkitemToolDefinitions, WorkitemToolContext } from './toolRegistry'

export type { WorkitemToolContext } from './toolRegistry'

export function createWorkitemTools(context: WorkitemToolContext) {
  const tools = getWorkitemToolDefinitions(context).map(definition => tool(
    definition.name,
    definition.description,
    definition.input,
    async (args) => definition.handler(args as Record<string, unknown>)
  ))

  return createSdkMcpServer({
    name: 'workitems',
    version: '1.0.0',
    tools,
  })
}
