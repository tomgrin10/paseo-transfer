import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { dispatch, snapshot } from "../server/worker";

let root: string;
const previousCli = process.env.PASEO_SYNC_CLI;

before(async () => {
  root = await mkdtemp(join(tmpdir(), "transfer-availability-"));
  const cli = join(root, "paseo-fixture.mjs");
  const rows = [
    {
      workspaceId: "ready",
      name: "Ready",
      cwd: join(root, "ready"),
      isolation: "directory",
      project: "",
      archivingAt: null,
    },
    {
      workspaceId: "archiving",
      name: "Archiving",
      cwd: join(root, "must-not-read"),
      isolation: "directory",
      project: "",
      archivingAt: "2026-11-23T00:00:00Z",
    },
    {
      workspaceId: "older",
      name: "Older",
      cwd: join(root, "older"),
      isolation: "directory",
      project: "",
    },
  ];
  await writeFile(
    cli,
    `#!/usr/bin/env node
console.log(process.argv.includes("--version") ? "0.17.1" : ${JSON.stringify(JSON.stringify(rows))});
`,
    { mode: 0o700 },
  );
  process.env.PASEO_SYNC_CLI = cli;
});

after(async () => {
  if (previousCli === undefined) delete process.env.PASEO_SYNC_CLI;
  else process.env.PASEO_SYNC_CLI = previousCli;
  await rm(root, { recursive: true, force: true });
});

test("source lists exclude workspaces being archived, including alongside older rows", async () => {
  const result = (await dispatch({ action: "list", home: root })) as {
    workspaces: { workspaceId: string }[];
  };
  assert.deepEqual(
    result.workspaces.map((row) => row.workspaceId),
    ["ready", "older"],
  );
});

test("snapshot refuses a workspace being archived before reading its directory", async () => {
  await assert.rejects(
    snapshot(root, "archiving"),
    /Workspace is missing or archived/,
  );
});
