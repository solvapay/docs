export const McpConnectActions = () => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [copiedLabel, setCopiedLabel] = React.useState('')

  const endpoint = 'https://mcp.solvapay.com/mcp'
  const serverName = 'solvapay'

  const createCursorDeepLink = apiKey => {
    const config = {
      url: endpoint,
      headers: {
        'X-API-Key': apiKey || 'YOUR_API_KEY_HERE',
      },
    }

    const encodedConfig = btoa(JSON.stringify(config))
    return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(serverName)}&config=${encodeURIComponent(encodedConfig)}`
  }

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedLabel(`${label} copied`)
      setTimeout(() => {
        setCopiedLabel('')
      }, 1800)
    } catch {
      setCopiedLabel(`Could not copy ${label}`)
      setTimeout(() => {
        setCopiedLabel('')
      }, 2200)
    }
  }

  const openCursorInstall = () => {
    const enteredKey = window.prompt(
      'Enter your SolvaPay API key (from Settings > API Keys). Leave empty to add the placeholder and update it later.',
    )
    const deeplink = createCursorDeepLink(enteredKey?.trim())
    window.location.href = deeplink
  }

  const vscodeConfig = JSON.stringify(
    {
      servers: {
        solvapay: {
          type: 'http',
          url: endpoint,
          headers: {
            'X-API-Key': 'YOUR_API_KEY_HERE',
          },
        },
      },
    },
    null,
    2,
  )

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        solvapay: {
          url: endpoint,
          headers: {
            'X-API-Key': 'YOUR_API_KEY_HERE',
          },
        },
      },
    },
    null,
    2,
  )

  const addMcpCommand = `npx add-mcp ${endpoint} --header "X-API-Key: YOUR_API_KEY_HERE"`

  return (
    <div className="not-prose">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-white/20 dark:bg-white/[0.03] dark:text-zinc-100 dark:hover:bg-white/[0.06]"
      >
        Connect SolvaPay MCP
        <span aria-hidden>{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 max-w-[560px] rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/15 dark:bg-white/[0.03]">
          <button
            type="button"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.08]"
            onClick={openCursorInstall}
          >
            <span className="block text-sm font-semibold leading-tight">Install in Cursor</span>
            <span className="mt-1.5 block text-xs leading-snug text-zinc-600 dark:text-zinc-400">
              One-click deeplink install with SolvaPay endpoint
            </span>
          </button>

          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.08]"
            onClick={() => copyText(endpoint, 'Claude.ai connector URL')}
          >
            <span className="block text-sm font-semibold leading-tight">Copy Claude.ai connector URL</span>
            <span className="mt-1.5 block text-xs leading-snug text-zinc-600 dark:text-zinc-400">
              Paste into Claude.ai Settings &gt; Connectors — sign in with your SolvaPay account
            </span>
          </button>

          <div className="my-2 h-px bg-zinc-200 dark:bg-white/10" />

          <button
            type="button"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.08]"
            onClick={() => copyText(vscodeConfig, 'VS Code config')}
          >
            <span className="block text-sm font-semibold leading-tight">Copy VS Code config</span>
            <span className="mt-1.5 block text-xs leading-snug text-zinc-600 dark:text-zinc-400">
              Paste into `.vscode/mcp.json` or user `mcp.json`
            </span>
          </button>

          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.08]"
            onClick={() => copyText(claudeDesktopConfig, 'Claude Desktop config')}
          >
            <span className="block text-sm font-semibold leading-tight">
              Copy Claude Desktop config
            </span>
            <span className="mt-1.5 block text-xs leading-snug text-zinc-600 dark:text-zinc-400">
              Paste into `claude_desktop_config.json`
            </span>
          </button>

          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.08]"
            onClick={() => copyText(endpoint, 'MCP endpoint')}
          >
            <span className="block text-sm font-semibold leading-tight">Copy MCP endpoint</span>
            <span className="mt-1.5 block text-xs leading-snug text-zinc-600 dark:text-zinc-400">
              Use this URL in any Streamable HTTP MCP client
            </span>
          </button>

          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.08]"
            onClick={() => copyText(addMcpCommand, 'add-mcp command')}
          >
            <span className="block text-sm font-semibold leading-tight">Copy add-mcp command</span>
            <span className="mt-1.5 block text-xs leading-snug text-zinc-600 dark:text-zinc-400">
              CLI shortcut for custom setup flows
            </span>
          </button>

          <div className="mt-2 min-h-5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {copiedLabel}
          </div>
        </div>
      )}
    </div>
  )
}
