import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";
const endpoint = z.object({
  target: z.string().default(""),
  home: z.string().optional(),
  identityFile: z.string().optional(),
  knownHostsFile: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
});
export const hostsRpc = defineRpc({
  name: "transfer.hosts",
  input: z.object({}),
  output: z.object({
    hosts: z.array(
      z.object({
        target: z.string(),
        label: z.string(),
        source: z.enum(["ssh", "tailscale"]),
      }),
    ),
  }),
});
export const listRpc = defineRpc({
  name: "transfer.workspaces",
  input: z.object({ endpoint }),
  output: z.object({
    workspaces: z.array(
      z.object({
        workspaceId: z.string(),
        name: z.string(),
        cwd: z.string(),
        isolation: z.string(),
        project: z.string(),
      }),
    ),
  }),
});
export const previewRpc = defineRpc({
  name: "transfer.preview",
  input: z.object({
    source: endpoint,
    target: endpoint,
    workspaceId: z.string(),
    destination: z.string().min(1),
    mode: z.enum(["copy", "move"]),
  }),
  output: z.object({
    id: z.string(),
    workspace: z.object({
      workspaceId: z.string(),
      name: z.string(),
      cwd: z.string(),
      isolation: z.string(),
      project: z.string(),
    }),
    destination: z.string(),
    files: z.number(),
    sessions: z.number(),
    bytes: z.number(),
    branch: z.string().nullable(),
    skipped: z.array(z.string()),
    mode: z.enum(["copy", "move"]),
  }),
});
export const runRpc = defineRpc({
  name: "transfer.run",
  input: z.object({ planId: z.string() }),
  output: z.object({ runId: z.string() }),
});
const stageRecord = z.object({
  id: z.enum(["check", "copy", "verify", "archive"]),
  startedAt: z.number(),
  endedAt: z.number().optional(),
});
export const statusRpc = defineRpc({
  name: "transfer.status",
  input: z.object({ runId: z.string() }),
  output: z.object({
    state: z.enum(["running", "done", "failed"]),
    message: z.string(),
    /** Presentation only: when each step ran, for the stage rail. Absent before 2.1. */
    mode: z.enum(["copy", "move"]).optional(),
    /** The SSH destination it goes to; empty when it lands on the host that runs it. */
    targetHost: z.string().optional(),
    stages: z.array(stageRecord).optional(),
    startedAt: z.number().optional(),
    endedAt: z.number().optional(),
    result: z
      .object({
        workspaceId: z.string(),
        cwd: z.string(),
        agents: z.array(z.string()),
        verified: z.boolean(),
        sourceArchived: z.boolean(),
      })
      .nullable(),
  }),
});
