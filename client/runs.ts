import { useSyncExternalStore } from "react";
import { statusRpc } from "../shared/rpc";
import type { TransferResult } from "../shared/types";
import {
  readFailure,
  stagePlan,
  stagesOf,
  type Failure,
  type Stage,
  type StageRecord,
} from "../shared/progress";
import { connectedTransfer } from "./connected-transfer";
import { rpcForHost } from "./federation";

/** What the app remembers about a transfer it started, for the popup, screen and header icon. */
export interface TrackedRun {
  runId: string;
  transport: "connected" | "ssh";
  /** The host whose plugin owns an SSH run's status. */
  hostId: string;
  /** `${hostId}:${workspaceId}` of the workspace whose popup started it; "" from the screen. */
  key: string;
  workspaceName: string;
  sourceLabel: string;
  targetLabel: string;
  /** The Paseo host the result opens on, or null for an SSH host outside Paseo. */
  openOn: string | null;
  mode: "copy" | "move";
  destination: string;
  files: number;
  sessions: number;
  bytes: number;
  startedAt: number;
}

export interface RunView extends TrackedRun {
  state: "running" | "done" | "failed";
  message: string;
  stages: Stage[];
  /** Copy progress, 0–1 (connected transfers only). */
  copied: number;
  endedAt?: number;
  result: TransferResult | null;
  failure: Failure | null;
  /** Status could not be read: the app or the plugin reloaded. */
  lost: boolean;
  /** The person has looked at how it ended. */
  seen: boolean;
}

type SshStatus = {
  state: "running" | "done" | "failed";
  message: string;
  result: TransferResult | null;
  stages?: StageRecord[];
  endedAt?: number;
};

function createRunStore() {
  const tracked = new Map<string, TrackedRun>();
  const ssh = new Map<string, SshStatus | { lost: string }>();
  const seen = new Set<string>();
  const watching = new Map<string, number>();
  const listeners = new Set<() => void>();
  let version = 0;
  let cache: { version: number; views: RunView[] } = { version: -1, views: [] };
  let timer: ReturnType<typeof setInterval> | undefined;

  const notify = () => {
    version++;
    for (const listener of listeners) listener();
  };

  function view(run: TrackedRun): RunView {
    const base = { ...run, seen: seen.has(run.runId) };
    if (run.transport === "connected") {
      const live = connectedTransfer.peek(run.runId);
      if (!live)
        return {
          ...base,
          state: "failed",
          message:
            "Transfer status is unavailable after reloading the app. Check the target workspace before retrying.",
          stages: [],
          copied: 0,
          result: null,
          failure: null,
          lost: true,
        };
      return {
        ...base,
        state: live.state,
        message: live.message,
        stages: stagesOf(
          stagePlan(run.mode, "connected"),
          live.stages,
          live.state,
        ),
        copied: live.copied,
        endedAt: live.endedAt,
        result: live.result,
        failure:
          live.state === "failed"
            ? readFailure(live.error ?? live.message)
            : null,
        lost: false,
      };
    }
    const status = ssh.get(run.runId);
    if (status && "lost" in status)
      return {
        ...base,
        state: "failed",
        message: status.lost,
        stages: [],
        copied: 0,
        result: null,
        failure: null,
        lost: true,
      };
    const state = status?.state ?? "running";
    return {
      ...base,
      state,
      message: status?.message ?? "Checking source…",
      stages: stagesOf(
        stagePlan(run.mode, "ssh"),
        status?.stages ?? [{ id: "check", startedAt: run.startedAt }],
        state,
      ),
      copied: 0,
      endedAt: status?.endedAt,
      result: status?.result ?? null,
      failure: state === "failed" ? readFailure(status!.message) : null,
      lost: false,
    };
  }

  async function pollSsh() {
    const open = [...tracked.values()].filter((run) => {
      if (run.transport !== "ssh") return false;
      const status = ssh.get(run.runId);
      return !status || ("state" in status && status.state === "running");
    });
    if (!open.length) {
      clearInterval(timer);
      timer = undefined;
      return;
    }
    let changed = false;
    await Promise.all(
      open.map(async (run) => {
        try {
          const status = await rpcForHost(run.hostId)(statusRpc, {
            runId: run.runId,
          });
          const before = ssh.get(run.runId);
          if (JSON.stringify(before) !== JSON.stringify(status)) {
            ssh.set(run.runId, status);
            changed = true;
          }
        } catch (error) {
          ssh.set(run.runId, { lost: (error as Error).message });
          changed = true;
        }
      }),
    );
    if (changed) notify();
  }

  connectedTransfer.subscribe(notify);

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Newest first. Stable between changes, so hooks can return it directly. */
    views(): RunView[] {
      if (cache.version !== version)
        cache = {
          version,
          views: [...tracked.values()]
            .sort((a, b) => b.startedAt - a.startedAt)
            .map(view),
        };
      return cache.views;
    },
    track(run: TrackedRun) {
      tracked.set(run.runId, run);
      // Keep the latest dozen; older finished runs drop off the list.
      const finished = [...tracked.values()]
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(12);
      for (const old of finished) tracked.delete(old.runId);
      if (run.transport === "ssh" && !timer)
        timer = setInterval(() => void pollSsh(), 1000);
      notify();
    },
    /** A panel showing this run is mounted; its ending needs no toast. */
    watch(runId: string) {
      watching.set(runId, (watching.get(runId) ?? 0) + 1);
      return () => {
        const count = (watching.get(runId) ?? 1) - 1;
        if (count > 0) watching.set(runId, count);
        else watching.delete(runId);
      };
    },
    watched: (runId: string) => watching.has(runId),
    markSeen(runId: string) {
      if (seen.has(runId)) return;
      seen.add(runId);
      notify();
    },
    /** Stop restoring this run when its popup reopens; it stays in the session list. */
    detach(runId: string) {
      const run = tracked.get(runId);
      if (!run?.key) return;
      tracked.set(runId, { ...run, key: "" });
      notify();
    },
    /** Read an SSH run's status again after it could not be read. */
    retry(runId: string) {
      const run = tracked.get(runId);
      if (run?.transport !== "ssh") return;
      ssh.delete(runId);
      if (!timer) timer = setInterval(() => void pollSsh(), 1000);
      notify();
    },
  };
}

/**
 * One store per installation, next to the connected runs it reads: a host's popup, screen and
 * header icon all come from that host's installation.
 */
export const runs = createRunStore();

export function useRuns(): RunView[] {
  return useSyncExternalStore(runs.subscribe, runs.views, runs.views);
}

/** The latest run started from this workspace's popup, if any. */
export function useLatestRun(key: string): RunView | undefined {
  return useRuns().find((run) => key && run.key === key);
}

export function useRun(runId: string): RunView | undefined {
  return useRuns().find((run) => run.runId === runId);
}
