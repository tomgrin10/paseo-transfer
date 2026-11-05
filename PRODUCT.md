# Transfer

<!-- impeccable:product-schema 1 -->

> Updated during the November 2026 UI polish pass without a live interview. Facts come from the
> README, AGENTS.md, docs/behavior.md, the code and the owner's written brief; lines marked
> _(inferred)_ are assumptions to confirm.

## Platform

adaptive

## Users

Developers who run Paseo on more than one machine (a laptop and a build server or VM) and want to
continue a workspace on the other one: its Git history, uncommitted changes and Claude/Codex
conversations together. Tom requested a maintained replacement for paseo-plugin-sync, updated to
current Paseo and simplified with its current features.

## Product Purpose

Copy or move one workspace to another connected host in a single verified step. Copy keeps the
source open. Move archives the source only after the destination is verified. This is a one-shot
transfer, not continuous synchronization. Success is a person who presses Transfer, reads exactly
what will travel, and opens the same workspace, with its conversations, on the other host a minute
later.

## Positioning

The only Paseo plugin that moves a workspace together with its native agent transcripts, verified
end to end, over the connections Paseo already has. _(inferred)_ The alternatives are a manual
`git push` plus losing the conversations, or rsync plus hand-editing transcript paths.

## Operating Context

- Entry points: the **Transfer** button at the top right of each workspace (a popup with that
  workspace selected; on phones it sits in the workspace actions menu), ⌘K **Transfer this
  workspace** / **Transfer a workspace** for the full screen with incoming transfers, an optional
  sidebar row, Settings → Plugins → Transfer → Display.
- The default transport reuses authenticated Paseo connections with Transfer on both hosts. **Use
  SSH** reaches hosts without the plugin.
- Agents can list destinations (`transfer_list_hosts`) and read progress (`transfer_run_status`);
  starting a transfer always goes through the preview a person confirms.
- Used mostly on desktop and web _(inferred)_; phones get the same flow in a sheet.

## Capabilities and Constraints

- A transfer needs a new destination directory. Files, modes, symlinks, Git HEAD and index,
  transcripts, imports and workspace registration are verified before a Move archives the source.
- Git-ignored files, provider credentials, MCP and launch settings stay on the source. Move refuses
  worktrees that contain ignored files. Running agents, unsupported providers and missing
  transcripts block the transfer instead of dropping history.
- A failure before registration removes the destination; after registration the partial
  destination is preserved and reported. Transfer never removes a source itself.
- Connected transfers run in the app: keep Paseo open and both hosts connected. Closing the popup is
  safe. Plugin reloads clear preview and status state.
- Paseo ≥ 0.14, Node 22+, Linux/macOS/WSL, host theme tokens only, no runtime dependencies.

## Brand Commitments

Part of Tom Gringauz's Paseo plugin family (Follow-up, Defer, Smart Session, Transcript Search,
Vitals, …): native to Paseo, host theme tokens only, the shared slate icon tile, plain short copy,
accent green only for primary actions and switches.

## Evidence on Hand

Real transfers between two isolated harness daemons ("Laptop", "Build server") with synthetic Git
workspaces and Claude/Codex transcripts; no usage analytics. Registry installs: 10 at the time of
this pass.

## Product Principles

1. Show what will travel and what stays behind before anything moves.
2. Never imply a step finished before it was verified; name the host for every state.
3. A failure says what happened, where each copy is now, and the next safe step.
4. Never start, retry or archive without the person confirming the preview.
