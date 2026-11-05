import { z } from "zod";
import { formatDuration } from "./progress";

/**
 * Transfer's agent tools as they appear in a chat, reduced to what a one-line row needs.
 * Pure, so the transformer and the tests read the same rules.
 */
export const TOOL_ROW_KIND = "transfer-tool-row";

export const ToolRowSchema = z.object({
  tool: z.enum(["hosts", "status"]),
  state: z.enum(["running", "done", "failed"]),
  /** hosts: what discovery found. */
  hosts: z.array(
    z.object({ label: z.string(), target: z.string(), source: z.string() }),
  ),
  /** status: the run it read. */
  runId: z.string(),
  run: z
    .object({
      state: z.enum(["running", "done", "failed"]),
      message: z.string(),
      cwd: z.string(),
      archived: z.boolean(),
      took: z.string(),
    })
    .nullable(),
  error: z.string(),
});
export type ToolRow = z.infer<typeof ToolRowSchema>;

const TOOL = /(?:^|__|\.|\/|:)(transfer_list_hosts|transfer_run_status)$/;

/** `mcp__paseo__transfer_list_hosts` (Claude), `paseo.transfer_run_status` (Codex), or bare. */
export function transferToolName(name: string): ToolRow["tool"] | null {
  const match = TOOL.exec(name);
  if (!match) return null;
  return match[1] === "transfer_list_hosts" ? "hosts" : "status";
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The text a tool result carries, however the provider wrapped it. */
export function readText(value: unknown): string | undefined {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value.map((part) =>
      typeof part === "string"
        ? part
        : record(part) && typeof part.text === "string"
          ? part.text
          : undefined,
    );
    return parts.every((part) => part !== undefined)
      ? parts.join("\n")
      : undefined;
  }
  if (!record(value)) return undefined;
  if (record(value.structuredContent))
    return JSON.stringify(value.structuredContent);
  const key = ["output", "content", "text", "message", "result"].find(
    (name) => name in value,
  );
  return key ? readText(value[key]) : undefined;
}

function json(text: string | undefined): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(text);
    return record(value) ? value : null;
  } catch {
    return null;
  }
}

const str = (value: unknown, max = 400) =>
  typeof value === "string" ? value.slice(0, max) : "";

/** Builds a row from a tool call, or null when the call is not one of Transfer's. */
export function toolRow(
  name: string,
  status: string,
  detail: unknown,
  error: unknown,
): ToolRow | null {
  const tool = transferToolName(name);
  if (tool === null) return null;
  const input = record(detail) && record(detail.input) ? detail.input : {};
  const rawOutput =
    record(detail) && "output" in detail ? readText(detail.output) : undefined;
  const output = json(rawOutput);
  const failedOutput =
    record(detail) && record(detail.output) && detail.output.isError === true;
  const state: ToolRow["state"] =
    status === "failed" || failedOutput
      ? "failed"
      : status === "completed"
        ? "done"
        : "running";
  const hosts =
    output && Array.isArray(output.hosts) ? output.hosts.filter(record) : [];
  const result = output && record(output.result) ? output.result : null;
  const runState = output ? str(output.state) : "";
  const started =
    output && typeof output.startedAt === "number" ? output.startedAt : null;
  const ended =
    output && typeof output.endedAt === "number" ? output.endedAt : null;
  return {
    tool,
    state,
    hosts: hosts.slice(0, 20).map((host) => ({
      label: str(host.label, 120) || str(host.target, 120),
      target: str(host.target, 200),
      source: str(host.source, 20),
    })),
    runId: str(input.runId, 200),
    run:
      tool === "status" &&
      (runState === "running" || runState === "done" || runState === "failed")
        ? {
            state: runState,
            message: str(output!.message, 600),
            cwd: result ? str(result.cwd, 300) : "",
            archived: result?.sourceArchived === true,
            took:
              started !== null && ended !== null
                ? formatDuration(ended - started)
                : "",
          }
        : null,
    error:
      state === "failed"
        ? (readText(error) || rawOutput || "").slice(0, 500)
        : "",
  };
}

/** The row's one line. */
export function rowLine(row: ToolRow): string {
  if (row.tool === "hosts") {
    if (row.state === "running") return "Looking for transfer destinations…";
    if (row.state === "failed") return "Couldn't list transfer destinations";
    if (!row.hosts.length) return "Listed transfer destinations · none found";
    return `Listed transfer destinations · ${row.hosts.length} found`;
  }
  if (row.state === "running") return "Checking a transfer…";
  if (row.state === "failed" || !row.run) return "Couldn't read the transfer";
  if (row.run.state === "running")
    return `Transfer running · ${row.run.message}`;
  if (row.run.state === "failed") return "Checked the transfer · it stopped";
  return `Checked the transfer · ${row.run.archived ? "moved" : "copied"} and verified${row.run.took ? ` in ${row.run.took}` : ""}`;
}
