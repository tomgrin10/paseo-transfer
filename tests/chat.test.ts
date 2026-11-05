import { test } from "node:test";
import assert from "node:assert/strict";
import { homePath, rowLine, toolRow, transferToolName } from "../shared/chat";

test("Transfer's tools are recognised under every provider's naming", () => {
  assert.equal(transferToolName("mcp__paseo__transfer_list_hosts"), "hosts");
  assert.equal(transferToolName("paseo.transfer_run_status"), "status");
  assert.equal(transferToolName("transfer_run_status"), "status");
  assert.equal(transferToolName("mcp__paseo__transfer_start"), null);
  assert.equal(toolRow("Bash", "completed", {}, null), null);
});

test("host listings become one line and a list", () => {
  const output = {
    hosts: [
      { target: "build", label: "build", source: "ssh" },
      {
        target: "laptop.tail1234.ts.net",
        label: "laptop",
        source: "tailscale",
      },
    ],
  };
  const row = toolRow(
    "mcp__paseo__transfer_list_hosts",
    "completed",
    { input: {}, output: { structuredContent: output } },
    null,
  )!;
  assert.equal(rowLine(row), "Listed transfer destinations · 2 found");
  assert.equal(row.hosts[1].source, "tailscale");
  assert.equal(
    rowLine(toolRow("transfer_list_hosts", "running", {}, null)!),
    "Looking for transfer destinations…",
  );
});

test("status reads say how the transfer ended, with its time", () => {
  const done = toolRow(
    "paseo.transfer_run_status",
    "completed",
    {
      input: { runId: "run-1" },
      output: JSON.stringify({
        state: "done",
        message: "Workspace moved and verified.",
        result: { cwd: "/home/dana/Projects/x", sourceArchived: true },
        targetHost: "build-box",
        startedAt: 0,
        endedAt: 21_000,
      }),
    },
    null,
  )!;
  assert.equal(
    rowLine(done),
    "Checked the transfer · moved to build-box and verified in 21s",
  );
  const running = toolRow(
    "transfer_run_status",
    "completed",
    {
      output: JSON.stringify({
        state: "running",
        message: "Copying and verifying workspace…",
        result: null,
      }),
    },
    null,
  )!;
  assert.equal(
    rowLine(running),
    "Transfer running · Copying and verifying workspace…",
  );
  const failed = toolRow(
    "transfer_run_status",
    "failed",
    { output: "Transfer status is unavailable after a plugin reload." },
    "unavailable",
  )!;
  assert.equal(rowLine(failed), "Couldn't read the transfer");
  assert.equal(failed.error, "unavailable");
});

test("paths read home-relative", () => {
  assert.equal(homePath("/home/dana/Projects/x"), "~/Projects/x");
  assert.equal(homePath("/Users/dana"), "~");
  assert.equal(homePath("/srv/work/x"), "/srv/work/x");
});
