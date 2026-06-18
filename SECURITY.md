# Security Policy

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue.
Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository, or contact the maintainers directly. We aim to acknowledge
reports within a few business days.

## Handling scan data

This toolkit drives a real browser against whatever site you point it at and
writes scan reports and screenshots to disk.

- **Never commit scan artifacts.** `reports/`, `*.png`, and `.playwright-mcp/`
  are git-ignored by default. Scans of internal or customer applications may
  contain sensitive URLs, content, or screenshots — keep them local.
- **Keep credentials in `.env` only.** `.env` is git-ignored. Do not hardcode
  usernames, passwords, or tokens in skills, configs, or commits.
- **Review before sharing.** If you export a report or screenshot, confirm it
  contains no sensitive data before sending it anywhere external.
