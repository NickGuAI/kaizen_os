type AgentAuthFlags = {
  anthropicApiKey: boolean
  anthropicAuthToken: boolean
  claudeCodeOAuthToken: boolean
  claudeCodeOAuthTokenFd: boolean
  claudeCodeApiKeyFd: boolean
}

type AgentAuthPreference = 'oauth' | 'api_key' | 'anthropic_auth_token' | 'none'

export const getAgentAuthFlags = (): AgentAuthFlags => ({
  anthropicApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
  anthropicAuthToken: Boolean(process.env.ANTHROPIC_AUTH_TOKEN),
  claudeCodeOAuthToken: Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN),
  claudeCodeOAuthTokenFd: Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR),
  claudeCodeApiKeyFd: Boolean(process.env.CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR),
})

export const getAgentAuthPreference = (flags: AgentAuthFlags): AgentAuthPreference => {
  if (flags.claudeCodeOAuthToken || flags.claudeCodeOAuthTokenFd) return 'oauth'
  if (flags.anthropicApiKey || flags.claudeCodeApiKeyFd) return 'api_key'
  if (flags.anthropicAuthToken) return 'anthropic_auth_token'
  return 'none'
}

export const logAgentAuthConfig = (logger: Pick<Console, 'log'> = console): void => {
  const flags = getAgentAuthFlags()
  const preference = getAgentAuthPreference(flags)
  logger.log(`[agent-auth] preference=${preference} env=${JSON.stringify(flags)}`)
}

export const shouldLogAgentSdkStderr = (): boolean => {
  return process.env.DEBUG_CLAUDE_AGENT_SDK === '1' || process.env.AGENT_SDK_LOG_STDERR === '1'
}

export const createAgentSdkStderrLogger = (): ((data: string) => void) | undefined => {
  if (!shouldLogAgentSdkStderr()) {
    return undefined
  }

  return (data: string) => {
    const message = data.trimEnd()
    if (message) {
      console.warn(`[agent-sdk] ${message}`)
    }
  }
}
