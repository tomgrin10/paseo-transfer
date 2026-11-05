/**
 * What a transfer shows while it runs and after it ends, derived from the run's own records.
 * Pure and runtime-neutral, so the popup, the screen, the header icon and the tests read the same
 * rules. Nothing here changes what a transfer does.
 */

/** check → copy → verify → archive (Move only). SSH copies and verifies in one step. */
export type StageId = "check" | "copy" | "verify" | "archive";
export type StageState = "pending" | "running" | "done" | "failed";

export interface StageRecord {
  id: StageId;
  startedAt: number;
  endedAt?: number;
}

export interface Stage {
  id: StageId;
  state: StageState;
  startedAt?: number;
  endedAt?: number;
}

/** The stages a run will pass through, in order. */
export function stagePlan(
  mode: "copy" | "move",
  transport: "connected" | "ssh",
): StageId[] {
  const ids: StageId[] =
    transport === "connected" ? ["check", "copy", "verify"] : ["check", "copy"];
  return mode === "move" ? [...ids, "archive"] : ids;
}

/** Folds the recorded stage times into the plan: the last open stage fails with a failed run. */
export function stagesOf(
  plan: StageId[],
  records: readonly StageRecord[],
  state: "running" | "done" | "failed",
): Stage[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  const open = [...records].reverse().find((record) => !record.endedAt);
  return plan.map((id) => {
    const record = byId.get(id);
    if (!record) return { id, state: state === "done" ? "done" : "pending" };
    if (record.endedAt)
      return {
        id,
        state: "done",
        startedAt: record.startedAt,
        endedAt: record.endedAt,
      };
    if (state === "failed" && open?.id === id)
      return { id, state: "failed", startedAt: record.startedAt };
    if (state === "done")
      return { id, state: "done", startedAt: record.startedAt };
    return { id, state: "running", startedAt: record.startedAt };
  });
}

/** Opens `id`, closing whichever stage was still open. Returns a new list. */
export function enterStage(
  records: readonly StageRecord[],
  id: StageId,
  now = Date.now(),
): StageRecord[] {
  return [
    ...records.map((record) =>
      record.endedAt ? record : { ...record, endedAt: now },
    ),
    { id, startedAt: now },
  ];
}

/** Closes the open stage, if any. */
export function closeStages(
  records: readonly StageRecord[],
  now = Date.now(),
): StageRecord[] {
  return records.map((record) =>
    record.endedAt ? record : { ...record, endedAt: now },
  );
}

/** "<1s", "4s", "1m 05s", "1h 02m". Durations read in tabular figures. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 950) return "<1s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** Binary sizes as the rest of Transfer reports them: 0.6 MiB, 5.0 MiB, 812 KiB. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
}

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

/** The suggested new folder: the workspace folder's name under ~/Projects, marked as a transfer. */
export function suggestedDestination(cwd: string): string {
  const name = cwd.split("/").filter(Boolean).pop() ?? "workspace";
  return `~/Projects/${name}-transfer`;
}

export interface Failure {
  /** What went wrong, without the recovery sentence the worker appended. */
  cause: string;
  /** A registered but incomplete destination the worker kept for recovery. */
  preservedAt: string | null;
  /** The raw output behind a failed command, when the cause was read out of it. */
  detail: string | null;
}

/**
 * Node reports a failed child process as "Command failed: <command>\n<stderr>", and Paseo's CLI
 * writes its errors as JSON. Read the message out of that; keep the raw text as detail.
 */
function commandCause(text: string): { cause: string; detail: string } | null {
  const match = /^Command failed: ([^\n]*)\n([\s\S]*)$/.exec(text);
  if (!match) return null;
  const output = match[2].trim();
  let cause = output.split("\n").find((line) => line.trim()) ?? "";
  try {
    const parsed = JSON.parse(output) as { error?: { message?: unknown } };
    if (typeof parsed?.error?.message === "string")
      cause = parsed.error.message;
  } catch {
    /* Plain stderr: its first line is the message. */
  }
  return cause ? { cause: cause.replace(/^error: /, ""), detail: text } : null;
}

const PRESERVED =
  / ?Destination preserved at (.+?); source has not been archived\.$/;
const CONNECTED_TAIL =
  / ?(?:The verified destination is available; check both hosts before retrying\.|Check the target before retrying\. The source has not been removed by Transfer\.)$/;

/** Splits a run's failure message into its cause and the partial destination it names. */
export function readFailure(message: string): Failure {
  let cause = message.trim().replace(CONNECTED_TAIL, "");
  const preserved = PRESERVED.exec(cause);
  if (preserved) cause = cause.slice(0, preserved.index);
  const command = commandCause(cause.trim());
  return {
    cause: command?.cause ?? cause.trim(),
    preservedAt: preserved?.[1] ?? null,
    detail: command?.detail ?? null,
  };
}

/** Where a preview problem belongs in the form, and the one action that fixes it, if any. */
export type ProblemPlace =
  "destination" | "mode" | "agents" | "conversations" | "host" | "general";
export interface Problem {
  place: ProblemPlace;
  message: string;
  /** A short plain-language heading for the callout. */
  title: string;
  /** Only actions the backend accepts: switching to Copy for ignored files. */
  action?: "use-copy";
}

export function classifyProblem(
  message: string,
  mode: "copy" | "move",
): Problem {
  const text = message.trim();
  if (/Git-ignored files/.test(text))
    return {
      place: "mode",
      title: "Move would leave files behind",
      message:
        "This worktree has Git-ignored files, such as .env or dependencies, that do not transfer. Copy keeps them here with the source.",
      ...(mode === "move" ? { action: "use-copy" as const } : {}),
    };
  const exists =
    /^Destination already exists: (.+?)\. Choose a new directory\.$/.exec(text);
  if (exists || /^Destination already exists/.test(text))
    return {
      place: "destination",
      title: "That folder already exists",
      message: `${exists ? exists[1] : "The folder"} is already there. Choose a new one; Transfer never writes into an existing folder.`,
    };
  if (/^Destination must be/.test(text))
    return { place: "destination", title: "Check the folder", message: text };
  if (/^Session .+ already exists on the target host\.$/.test(text))
    return {
      place: "conversations",
      title: "A conversation is already there",
      message:
        "One of this workspace's conversations already exists on the other host, usually from an earlier transfer. Open that copy, or remove it there before transferring again.",
    };
  if (/^Target transcript already exists/.test(text))
    return {
      place: "conversations",
      title: "A conversation is already there",
      message: text,
    };
  if (/running agents/.test(text))
    return {
      place: "agents",
      title: "Agents are still running",
      message:
        "Stop the agents running in this workspace, then preview again. Running sessions can't be copied safely.",
    };
  if (/^Transfer cannot include every conversation: /.test(text))
    return {
      place: "conversations",
      title: "Some conversations can't travel",
      message: `${text
        .replace(/^Transfer cannot include every conversation: /, "")
        .split("; ")
        .join(
          "\n",
        )}\nTransfer moves every conversation or none, so nothing is dropped quietly.`,
    };
  if (/^Cannot find (claude|codex) transcript/.test(text))
    return {
      place: "conversations",
      title: "A conversation file is missing",
      message: text,
    };
  if (/unavailable on this host|Connect it in Paseo|host changed/i.test(text))
    return { place: "host", title: "Host unavailable", message: text };
  return { place: "general", title: "Preview failed", message: text };
}

/** The copy stage's progress line: "2.1 of 5.0 MiB". */
export function copiedLine(done: number, total: number): string {
  const ratio = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  return `${formatBytes(Math.round(ratio * total))} of ${formatBytes(total)}`;
}

/**
 * The header button's live icon: a ring that fills with the bytes sent, around an arrow. Drawn
 * as inline SVG through the host's Icon (plugins have no SVG library). Quantized to 1/24 so the
 * header redraws a couple of dozen times per transfer at most.
 */
export function progressGlyph(fraction: number): string {
  const steps = 24;
  const f = Math.round(Math.min(1, Math.max(0, fraction)) * steps) / steps;
  const r = 9;
  let arc = "";
  if (f >= 1) arc = `<circle cx="12" cy="12" r="${r}"/>`;
  else if (f > 0) {
    const angle = f * 2 * Math.PI;
    const x = (12 + r * Math.sin(angle)).toFixed(2);
    const y = (12 - r * Math.cos(angle)).toFixed(2);
    arc = `<path d="M12 ${12 - r}A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x} ${y}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="${r}" stroke-opacity="0.3"/>${arc}<path d="M8.5 12h7"/><path d="M12.5 9l3 3-3 3"/></svg>`;
}

/**
 * How far along a run is, for the header ring: finished stages out of all of them, with the copy
 * stage filling by the bytes sent. A ring is only full when every stage is done.
 */
export function ringFraction(stages: Stage[], copied: number): number {
  if (!stages.length) return 0;
  const done = stages.filter((stage) => stage.state === "done").length;
  const copying = stages.some(
    (stage) => stage.id === "copy" && stage.state === "running",
  );
  return (
    (done + (copying ? Math.min(1, Math.max(0, copied)) : 0)) / stages.length
  );
}
