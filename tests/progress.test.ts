import { test } from "node:test";
import assert from "node:assert/strict";
import { findSvgIconProblem } from "@getpaseo/plugin";
import {
  classifyProblem,
  closeStages,
  copiedLine,
  enterStage,
  formatBytes,
  formatDuration,
  progressGlyph,
  readFailure,
  ringFraction,
  stagePlan,
  stagesOf,
  suggestedDestination,
  type StageRecord,
} from "../shared/progress";

test("stage plans follow the transport and mode", () => {
  assert.deepEqual(stagePlan("copy", "connected"), ["check", "copy", "verify"]);
  assert.deepEqual(stagePlan("move", "connected"), [
    "check",
    "copy",
    "verify",
    "archive",
  ]);
  assert.deepEqual(stagePlan("move", "ssh"), ["check", "copy", "archive"]);
});

test("stage records fold into the plan without overstating progress", () => {
  let records: StageRecord[] = [{ id: "check", startedAt: 0 }];
  records = enterStage(records, "copy", 4000);
  assert.deepEqual(records[0], { id: "check", startedAt: 0, endedAt: 4000 });
  const plan = stagePlan("move", "connected");
  assert.deepEqual(
    stagesOf(plan, records, "running").map((stage) => stage.state),
    ["done", "running", "pending", "pending"],
  );
  // A failure marks only the open stage; later ones stay pending, never done.
  assert.deepEqual(
    stagesOf(plan, records, "failed").map((stage) => stage.state),
    ["done", "failed", "pending", "pending"],
  );
  const closed = closeStages(enterStage(records, "verify", 5000), 21000);
  assert.ok(closed.every((record) => record.endedAt));
  assert.deepEqual(
    stagesOf(stagePlan("copy", "connected"), closed, "done").map(
      (stage) => stage.state,
    ),
    ["done", "done", "done"],
  );
});

test("the header ring fills by finished stages and the copy's bytes", () => {
  const plan = stagePlan("copy", "connected");
  const checking = stagesOf(plan, [{ id: "check", startedAt: 0 }], "running");
  assert.equal(ringFraction(checking, 0), 0);
  const copying = stagesOf(
    plan,
    enterStage([{ id: "check", startedAt: 0 }], "copy", 10),
    "running",
  );
  assert.equal(ringFraction(copying, 0.5), 0.5);
  const verifying = stagesOf(
    plan,
    enterStage(
      enterStage([{ id: "check", startedAt: 0 }], "copy", 10),
      "verify",
      20,
    ),
    "running",
  );
  assert.ok(
    ringFraction(verifying, 1) < 1,
    "full only once every stage is done",
  );
});

test("the header glyph is a valid inline SVG icon at every fraction", () => {
  for (const fraction of [0, 0.01, 0.5, 0.51, 0.99, 1, 2, -1, Number.NaN])
    assert.equal(findSvgIconProblem(progressGlyph(fraction)), null);
  assert.equal(progressGlyph(0.5), progressGlyph(0.51), "quantized redraws");
});

test("durations, sizes and folders read plainly", () => {
  assert.equal(formatDuration(200), "<1s");
  assert.equal(formatDuration(4200), "4s");
  assert.equal(formatDuration(65_000), "1m 05s");
  assert.equal(formatDuration(3_720_000), "1h 02m");
  assert.equal(formatBytes(653 * 1024), "653 KiB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5.0 MiB");
  assert.equal(
    copiedLine(0.42 * 5 * 1024 * 1024, 5 * 1024 * 1024),
    "2.1 MiB of 5.0 MiB",
  );
  assert.equal(
    suggestedDestination("/home/dana/code/worktrees/invoice-retries"),
    "~/Projects/invoice-retries-transfer",
  );
});

test("failures split into their cause and a preserved destination", () => {
  assert.deepEqual(
    readFailure(
      "Imported agent verification failed. Destination preserved at /home/dana/Projects/x; source has not been archived.",
    ),
    {
      cause: "Imported agent verification failed.",
      preservedAt: "/home/dana/Projects/x",
      detail: null,
    },
  );
  assert.deepEqual(
    readFailure(
      "Host disconnected Check the target before retrying. The source has not been removed by Transfer.",
    ),
    { cause: "Host disconnected", preservedAt: null, detail: null },
  );
  assert.equal(
    readFailure(
      "Source archive verification failed. The verified destination is available; check both hosts before retrying.",
    ).cause,
    "Source archive verification failed.",
  );
});

test("a failed Paseo command reads as its own message, with the raw output kept", () => {
  const raw =
    'Command failed: paseo --home /h --json import a17e --provider codex --cwd /x\n{\n  "error": {\n    "code": "AGENT_IMPORT_FAILED",\n    "message": "Failed to import agent: model provider not found"\n  }\n}\n';
  const failure = readFailure(
    `${raw} Destination preserved at /x; source has not been archived.`,
  );
  assert.equal(
    failure.cause,
    "Failed to import agent: model provider not found",
  );
  assert.equal(failure.preservedAt, "/x");
  assert.match(failure.detail!, /^Command failed: paseo/);
  assert.equal(
    readFailure("Command failed: git fetch\nerror: bundle is corrupt\n").cause,
    "bundle is corrupt",
  );
});

test("preview problems land where they can be fixed, with only accepted actions", () => {
  const ignored = classifyProblem(
    "This worktree has Git-ignored files. Choose Copy to keep those files on the source.",
    "move",
  );
  assert.equal(ignored.place, "mode");
  assert.equal(ignored.action, "use-copy");
  assert.equal(
    classifyProblem(
      "This worktree contains Git-ignored files that will not be copied. Choose Copy to keep those files on the source.",
      "copy",
    ).action,
    undefined,
    "no Copy action once Copy is chosen",
  );
  const exists = classifyProblem(
    "Destination already exists: /home/dana/Projects/x. Choose a new directory.",
    "copy",
  );
  assert.equal(exists.place, "destination");
  assert.match(exists.message, /^\/home\/dana\/Projects\/x is already there\./);
  assert.equal(
    classifyProblem(
      "Stop the workspace’s running agents before transferring it.",
      "copy",
    ).place,
    "agents",
  );
  const skipped = classifyProblem(
    "Transfer cannot include every conversation: Proofread: no saved provider session; Notes: cursor sessions are not supported",
    "copy",
  );
  assert.equal(skipped.place, "conversations");
  assert.match(
    skipped.message,
    /^Proofread: no saved provider session\nNotes: cursor sessions are not supported\n/,
  );
  assert.equal(
    classifyProblem("Session 1f-… already exists on the target host.", "copy")
      .place,
    "conversations",
  );
  assert.equal(classifyProblem("Something else", "copy").place, "general");
});
