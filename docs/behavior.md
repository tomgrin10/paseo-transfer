# Transfer details

See the [README](../README.md) for installation and usage.

## What transfers

| Content              | Behavior                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Git history          | Local branches, tags, and the selected HEAD, including unpushed commits.                                         |
| Working tree         | Tracked files, staged and unstaged changes, non-ignored untracked files, executable bits, and internal symlinks. |
| Claude conversations | Native transcripts and saved subagent transcripts; the destination imports them through Paseo.                   |
| Codex conversations  | Native rollout files; the destination imports them through Paseo.                                                |
| Names and labels     | Workspace name and agent titles, labels, and archived state.                                                     |
| Directory workspaces | Plain files; `.git`, `node_modules`, `.venv`, and `__pycache__` directories are excluded.                        |

Git-ignored files such as `.env`, dependencies, provider credentials, daemon credentials, repository config/hooks, terminals, schedules, workspace pins, and provider-specific launch settings stay on the source. Imported agents use the target host's provider configuration. Conversation text stays intact; only structural `cwd` fields are translated.

Unsupported providers or missing saved conversations block the transfer rather than silently dropping history. Submodules, repositories without a commit, Git subdirectory workspaces, unmerged Git indexes, escaping symlinks, and snapshots above **128 MiB / 20,000 files** are not supported.

## Verification and recovery

Transfer refuses an occupied destination or an existing native session ID. It verifies file bytes, modes, symlinks, Git HEAD, staged changes, transcript bytes, agent imports, and workspace registration. It never overwrites an existing checkout or edits Paseo's workspace/agent registry files.

A failure before workspace registration removes the new destination. A failure after registration preserves the partial destination for recovery and reports its path. The source stays open. If archiving fails or the source changes during a move, the verified destination remains available and the source stays open. Plugin reloads clear preview/status state; check both hosts before retrying a transfer interrupted by reload.

Transfers use SSH with normal host-key verification. Git bundles travel over the same connection, so the receiving host does not need reverse SSH access. Previews retain only metadata and a checksum, not workspace contents.
