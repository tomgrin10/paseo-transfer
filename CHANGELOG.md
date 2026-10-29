# Changelog

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
