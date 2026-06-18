# Contributing

Thanks for your interest in improving this toolkit.

## Getting started

```bash
cd mcp && npm install && npm run build   # build the MCP server
npm test                                 # run the server's tests
```

## Project layout

- `mcp/` — the MCP accessibility server (TypeScript). Source in `mcp/src/`.
- `skills/` — Claude Code skills (Markdown `SKILL.md` files + reference docs).
- `install` — symlinks the skills and wires the MCP server into a project.

## Guidelines

- Keep changes focused and explain the "why" in your PR description.
- **Do not commit scan artifacts or credentials.** `reports/`, `*.png`, and
  `.env` are git-ignored — keep it that way.
- Use generic, non-customer example URLs and data in docs and tests
  (e.g. `http://localhost:3000/dashboard`, `example.com`).
- For server changes, run `npm run build && npm test` before opening a PR.
- For skill changes, keep examples generic and the workflow steps runnable
  without any private infrastructure.

## Reporting issues

Bugs and feature requests are welcome via GitHub issues. For security issues,
follow [SECURITY.md](SECURITY.md) instead.
