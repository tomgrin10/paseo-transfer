# Changelog

## 3.0.0 — 2026-11-05

A redesigned Transfer experience. Requires Paseo 0.14.0 or newer; plugin data and settings are preserved.

- The popup reads as a route and a receipt: destination hosts as cards with their status, then a preview of exactly what goes (branch, files with uncommitted changes, each conversation) and what stays (ignored files, sign-ins, MCP settings, the source workspace).
- Progress shows each step with its own time: check the source, copy (with the bytes sent), verify and import on the destination, archive for a move. Closing the popup is still safe; the Transfer button's icon fills as it runs and ends in a check or a cross, with a toast.
- A finished transfer offers **Open on <host>** from the popup too. A failure says where each copy is now (source still open, nothing kept or a partial copy kept for recovery) and folds the raw command output under **Show details**.
- Preview problems sit next to their fix: a Move blocked by ignored files offers **Use Copy instead**; an existing folder, running agents and conversations that can't travel are named in plain words.
- The Transfer screen sends or brings workspaces in two columns, keeps this session's transfers in a list, and uses `addScreen`/`addSidebarHeaderItem` instead of the deprecated surface APIs. ⌘K **Transfer this workspace** opens it with the current workspace selected.
- `transfer_list_hosts` and `transfer_run_status` calls show in chats as one-line rows.
- Transfer behavior, verification and safety checks are unchanged.

Install: `paseo plugin install paseo-transfer`

## 2.0.0 — 2026-10-29

`transfer_list_hosts` discovers configured SSH and Tailscale destinations; `transfer_run_status` reads an existing transfer’s progress. Transfers still use the preview and confirmation flow in the Transfer screen.

Requires Paseo 0.14.0 or newer. This release raises the previous minimum supported Paseo version. Plugin data and settings are preserved.

Install: `paseo plugin install paseo-transfer`

## 1.2.0

- Transfer directly between connected Paseo hosts with the plugin on both, reusing Transcript Search's host federation and Send to Paseo's explicit server targeting.
- List hosts by name, select a sole available destination, explain disconnected or missing installations, and keep SSH as an alternative.
- Relay bounded chunks, verify their checksum, recheck preview freshness, and archive moved sources only after destination verification.
- Refuse home and system directory workspaces before scanning protected folders such as macOS Trash; explain permission failures without skipping files.
- Open the verified workspace on its destination host and retain connected transfer progress when the popup is closed.

## 1.1.0

- Rename Sync to Transfer.
- Open a workspace-scoped transfer popup from a labelled header button.
- Hide the sidebar by default, with an optional host-persisted display setting and Command Center access.
- Keep the current workspace selected when changing target hosts, and retain transfer progress when reopening its popup.

## 1.0.0

- Rebuild for Paseo 0.11 with separate client/server entries and the official SDK.
- Discover SSH aliases and online Tailscale peers without a plugin peer/password registry.
- Copy or move one workspace with Git history, staged/unstaged changes, and native Claude/Codex conversations.
- Register workspaces and import agents through Paseo; stop writing daemon registry files and calculating internal path hashes.
- Refuse occupied destinations, session collisions, changed previews, running agents, unsupported conversations, and unsafe paths.
- Verify destination contents before archiving a moved source.
- Add isolated-daemon, Git, SSH, plugin-runtime, and real-provider resume verification.
