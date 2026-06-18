# Accessibility Toolkit for Claude Code

WCAG 2.1 / 2.2 accessibility scanning, fixing, and VPAT reporting — driven from
Claude Code through natural language.

This repository bundles two things that work together:

- **`mcp/`** — an [MCP](https://modelcontextprotocol.io/) server that runs
  real-browser accessibility audits with Playwright + axe-core (automated WCAG
  testing, screen-reader simulation, keyboard/focus checks).
- **`skills/`** — Claude Code skills that orchestrate the server into complete
  workflows:
  - **`a11y-scan`** — audit a page, plan and apply fixes, re-scan, and report.
  - **`a11y-vpat-scan`** — audit and validate issues, producing structured JSON.
  - **`a11y-vpat-report`** — generate a VPAT 2.5 conformance report from scan data.
  - **`double-check`** — a small verification helper used by the workflows.

The skills depend on the MCP server (it is their scanning engine), so they ship
together.

## Prerequisites

- Node.js 20+
- For VPAT PDF output: [Pandoc](https://pandoc.org/) (optional)

## Install

```bash
git clone https://github.com/civitaslearning/a11y-toolkit.git
cd a11y-toolkit

# Build the MCP server
cd mcp && npm install && npm run build && cd ..

# Install the skills + wire the MCP server into your project
./install /path/to/your/project
```

The installer symlinks the skills into `<project>/.claude/skills/`, adds the
`mcp-accessibility` server to `<project>/.mcp.json`, and seeds a `.env` from
`.env.example`. Restart Claude Code in the project to pick up the new server.

## Usage

In Claude Code, from your project:

```
/a11y-scan http://localhost:3000/dashboard          # audit + fix + report
/a11y-vpat-scan http://localhost:3000/dashboard      # audit + validate
/a11y-vpat-report                                    # build the VPAT report
```

Authenticated pages: set `PLAYWRIGHT_USER` / `PLAYWRIGHT_PASSWORD` in `.env`, or
configure a persistent browser profile (`CHROME_USER_DATA_DIR`) — see
`mcp/README.md`.

## VPAT disclaimer

The VPAT-style output produced by these tools is intended to **assist** the
preparation of an accessibility conformance report. It is **not** an official
conformance statement and does not replace review by a qualified accessibility
expert. Automated testing cannot detect every WCAG issue; manual evaluation is
required for a complete and legally sound conformance claim.

## Security

Never commit scan reports or screenshots of real applications — they are
ignored by default (see `.gitignore`). Credentials live only in `.env`
(untracked). See [SECURITY.md](SECURITY.md) to report a vulnerability.

## License

[MIT](LICENSE) © Civitas Learning. Dependencies are MIT / Apache-2.0.
