import { useState } from 'react'

export const McpConnectActions = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedLabel, setCopiedLabel] = useState('')

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
      'Enter your SolvaPay API key. Leave empty to install with YOUR_API_KEY_HERE.',
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

  const triggerStyle = {
    border: '1px solid rgba(255, 255, 255, 0.18)',
    background: 'rgba(255, 255, 255, 0.02)',
    color: 'inherit',
  }

  const panelStyle = {
    border: '1px solid rgba(255, 255, 255, 0.14)',
    background: 'rgba(255, 255, 255, 0.02)',
  }

  const actionStyle = {
    width: '100%',
    padding: '12px',
    textAlign: 'left',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'inherit',
    transition: 'filter 120ms ease',
  }

  const dividerStyle = {
    height: '1px',
    background: 'rgba(255, 255, 255, 0.12)',
  }

  const titleStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: 1.2,
  }

  const subtitleStyle = {
    display: 'block',
    marginTop: '6px',
    fontSize: '12px',
    color: 'var(--color-muted)',
    lineHeight: 1.35,
  }

  return (
    <div className="not-prose">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition"
        style={triggerStyle}
      >
        Connect SolvaPay MCP
        <span aria-hidden>{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 max-w-[560px] rounded-2xl p-3" style={panelStyle}>
          <button type="button" style={actionStyle} onClick={openCursorInstall}>
            <span style={titleStyle}>Install in Cursor</span>
            <span style={subtitleStyle}>One-click deeplink install with SolvaPay endpoint</span>
          </button>

          <div className="my-2" style={dividerStyle} />

          <button
            type="button"
            style={actionStyle}
            onClick={() => copyText(vscodeConfig, 'VS Code config')}
          >
            <span style={titleStyle}>Copy VS Code config</span>
            <span style={subtitleStyle}>Paste into `.vscode/mcp.json` or user `mcp.json`</span>
          </button>

          <button
            type="button"
            className="mt-2"
            style={actionStyle}
            onClick={() => copyText(claudeDesktopConfig, 'Claude Desktop config')}
          >
            <span style={titleStyle}>Copy Claude Desktop config</span>
            <span style={subtitleStyle}>Paste into `claude_desktop_config.json`</span>
          </button>

          <button
            type="button"
            className="mt-2"
            style={actionStyle}
            onClick={() => copyText(endpoint, 'MCP endpoint')}
          >
            <span style={titleStyle}>Copy MCP endpoint</span>
            <span style={subtitleStyle}>Use this URL in any Streamable HTTP MCP client</span>
          </button>

          <button
            type="button"
            className="mt-2"
            style={actionStyle}
            onClick={() => copyText(addMcpCommand, 'add-mcp command')}
          >
            <span style={titleStyle}>Copy add-mcp command</span>
            <span style={subtitleStyle}>CLI shortcut for custom setup flows</span>
          </button>

          <div className="mt-2 min-h-5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {copiedLabel}
          </div>
        </div>
      )}
    </div>
  )
}
