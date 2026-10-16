# Verification

## 1.2.0 — 2026-10-16

- Node 24.20.0, Paseo 0.11.2, official SDK 0.11.1. Verification covers 22 tests: the existing Git/SSH and workspace-button checks, real authenticated plugin RPC transfers between two isolated daemon homes, and host capability lifecycle checks.
- Connected transport checks cover multiple chunks, reverse transfers, verified move/archive, stale previews, disconnected targets, explicit server identity, chunk ordering/size, corrupt uploads, and source preservation. The home/system directory guard rejects the home directory, filesystem root, and a symlink to home before recursion.
- `npm run test:live` passed through the new connected-plugin transport. Real Claude and Codex sessions imported on the receiving daemon, resumed through its supported API, and recalled a source-only marker. Credentials were confined to temporary isolated provider homes and removed afterward.
- Actual React Native components completed copy previews, copy completion, popup close/reopen, and incoming transfer previews in Chromium fixtures. Desktop (1280×844) and compact (390×844), light and dark, showed no horizontal overflow or browser runtime errors. Compact inputs compute to 16px. Offline hosts remain labelled and disabled. The Impeccable detector returned no findings.
- The README screenshot uses fixture data. Package inspection includes the generated SSH worker and connected transport, with no runtime dependencies or credentials. A secret-pattern scan found no matches. The publishing workflow passed and npm integrity matched the local package. The bare `paseo-transfer` installer, compiled client bundle, identity RPC, and reload passed in an isolated home. The VM was upgraded to npm 1.2.0, the old Sync installation was disabled, and two plugin reloads plus a read-only RPC probe passed without restarting the daemon.
- These checks use independent daemons on one Linux host. Physical laptop-to-VM networking, macOS permission prompts and native iOS/Android interactions remain untested; the reported Trash error is addressed by guarding overly broad source directories and explaining filesystem permission errors.

## 1.1.0 — 2026-10-12

- Typecheck and formatting pass. The 12 isolated-daemon Git/SSH integration tests pass; four additional tests cover paginated workspace header registration, closed workspaces, unload races, failed refreshes, and the hidden sidebar default.
- Desktop (760×560) and compact (390×844) browser checks render the actual Transfer popup with fixture RPCs. Target changes preserve the current workspace; copy/move previews and copy completion pass; reopening retains the result. No horizontal overflow or browser runtime errors were observed. Paseo owns popup sizing and scrolling.
- The README screenshot uses that fixture preview. Package dry run includes the generated worker, display settings, and documentation.
- No provider/import behavior changed. The real-provider test below describes version 1.0.0; it was not rerun for this UI and naming update.

## 1.0.0

Verified on 2026-10-08, with Node 24.20.0, installed Paseo 0.11.0, and official SDK 0.11.1.

- `npm run verify`: typecheck, formatting, and 12 passing integration tests. Tests start two independent temporary Paseo homes, use real Git repositories and worktrees, and transport snapshots through an encrypted SSH fixture.
- Coverage: all local branches, unpushed commits, staged and unstaged changes, deleted and untracked files, executable modes, symlinks, directory workspaces, stale previews, verified move/archive, ignored-file move protection, occupied destinations, path/checksum rejection, rollback, and SSH push/pull.
- `npm run test:live`: passing. The plugin loaded in the source daemon, Paseo compiled its client bundle, and a plugin RPC completed. Real Claude and Codex conversations were created in isolated provider homes. The transfer ran through the actual `sync.preview`, `sync.run`, and `sync.status` plugin RPCs over SSH. Both provider sessions imported into the target daemon and resumed through its agent API, returning a marker seen only in the source conversation.
- UI: the actual React Native component rendered with representative fixture RPCs at 1280×1000 and 390×844. Host selection, workspace selection, preview, and copy controls completed their fixture flow; browser console reported no errors. The design detector returned no findings and the independent finishing reviewer returned `ship` at the inherited Paseo form scope.
- Package dry run: includes split entries, server/client/shared source, and generated SSH worker.

The SSH test server is loopback on this Linux host. This verifies encryption, command transport, independently running daemons, filesystem and session transfer, and provider resume; it does not claim a separate physical machine or macOS run. Production daemon restart was not required.

`codex exec` returned without a saved thread during an initial standalone smoke attempt on this installation. The final smoke test creates and resumes Codex through Paseo's supported integration and passed. No standalone CLI output format is relied on by the plugin.
