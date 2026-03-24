import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { getKaizenDbToolDefinitions, ToolContext } from './toolRegistry'

export type { ToolContext } from './toolRegistry'

export function createAgentTools(context: ToolContext) {
  const tools = getKaizenDbToolDefinitions(context).map(definition => tool(
    definition.name,
    definition.description,
    definition.input,
    async (args) => definition.handler(args as Record<string, unknown>)
  ))

  return createSdkMcpServer({
    name: 'kaizen-db',
    version: '1.0.0',
    tools,
  })
}
