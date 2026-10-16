# paseo-transfer

[![npm version](https://img.shields.io/npm/v/paseo-transfer?style=for-the-badge&color=cb3837)](https://www.npmjs.com/package/paseo-transfer)
[![npm downloads](https://img.shields.io/npm/dm/paseo-transfer?style=for-the-badge&color=cb3837)](https://www.npmjs.com/package/paseo-transfer)
[![Paseo](https://img.shields.io/badge/Paseo-%E2%89%A5%200.11.0-8A63D2?style=for-the-badge)](https://paseo.sh)
[![License](https://img.shields.io/github/license/tomgrin10/paseo-transfer?style=for-the-badge&color=2563eb)](LICENSE)

Copy or move a workspace to another host, with Git history, local changes, and Claude/Codex conversations.

![Transfer popup with the current workspace selected and a verified copy preview](docs/screenshots/transfer.png)

Example using fixture workspace and host data.

## Install

Enable plugins in **Settings → Plugins**, then run on both hosts:

```sh
paseo plugin install paseo-transfer
```

Both hosts need Paseo **0.11.0+**, Node **22+**, Git, and Linux/macOS or WSL. Connect both hosts in Paseo and keep their daemons running. The receiving host needs its own provider CLIs and credentials.

## Use

1. Stop running agents, open a workspace, and press **Transfer** at the top right.
2. Choose a connected **Paseo host** and a **new directory**. No extra pairing, passwords, or SSH setup.
3. Choose **Copy** or **Move**, press **Preview transfer**, review the details, and start.

**Copy** keeps the source. **Move** archives it after verification; a managed source worktree may be removed. Git-ignored files stay behind, so Move refuses worktrees containing them.

Close and reopen the popup to check progress. Keep Paseo open and both hosts connected until the transfer finishes. The sidebar is hidden by default; enable it in **Settings → Plugins → Transfer → Display**. **⌘K / Ctrl+K → Transfer a workspace** opens the full screen, including incoming transfers.

## Data and recovery

Transfers use your existing authenticated Paseo connections. **Use SSH** is available for hosts without the plugin; it uses SSH aliases, keys, and normal host-key verification. Transfer project workspaces rather than your entire home directory. Provider credentials, MCP settings, Git-ignored files, and launch settings stay on their original hosts. Copies are independent checkouts; registered partial transfers are kept for recovery.

See the [transfer details](docs/behavior.md) for supported content, limits, and failure handling.

## Development

```sh
npm ci
npm run verify
```

Reload with `paseo plugin reload transfer`. Provider checks: `npm run test:live`. UI preview: `npx tsx scripts/ui-preview.tsx`.

## License

[MIT](LICENSE). Rebuilt from [itsjustanks/paseo-plugin-sync](https://github.com/itsjustanks/paseo-plugin-sync); its original attribution is preserved.

## Other plugins

- [Defer](https://github.com/tomgrin10/paseo-defer) — Schedule messages for later delivery.
- [Graphite](https://github.com/tomgrin10/paseo-graphite) — Graphite stacks and PR status.
- [Smart Session](https://github.com/tomgrin10/paseo-smart-session) — Context compaction and usage insights.
- [Vitals](https://github.com/tomgrin10/paseo-vitals) — Host, agent, and Docker health.
- [Session Guard](https://github.com/tomgrin10/paseo-session-guard) — Pause at session limits and continue after reset.
- [Transcript Search](https://github.com/tomgrin10/paseo-transcript-search) — Search conversations across connected hosts.
- [Send to Paseo](https://github.com/tomgrin10/send-to-paseo) — Send GitHub and Graphite PRs to Paseo from Chrome.
- [Dispatch](https://github.com/tomgrin10/paseo-dispatch) — Route tasks to existing workspaces (development preview).
