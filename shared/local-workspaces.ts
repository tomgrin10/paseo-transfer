import type { Workspace } from "./types";
export function localWorkspaceRows(
  values: readonly unknown[],
): Workspace[] | null {
  const rows: Workspace[] = [];
  for (const value of values) {
    if (!value || typeof value !== "object") return null;
    const row = value as {
      id?: unknown;
      directory?: unknown;
      name?: unknown;
      kind?: unknown;
      projectId?: unknown;
      projectDisplayName?: unknown;
      archivingAt?: unknown;
      archivedAt?: unknown;
    };
    if (row.archivedAt != null || row.archivingAt != null) continue;
    if (typeof row.id !== "string" || typeof row.directory !== "string")
      return null;
    rows.push({
      workspaceId: row.id,
      name: typeof row.name === "string" ? row.name : row.id,
      cwd: row.directory,
      isolation: typeof row.kind === "string" ? row.kind : "directory",
      project:
        typeof row.projectDisplayName === "string"
          ? row.projectDisplayName
          : typeof row.projectId === "string"
            ? row.projectId
            : "",
    });
  }
  return rows;
}
