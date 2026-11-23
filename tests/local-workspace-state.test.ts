import test from "node:test";
import assert from "node:assert/strict";
import { localWorkspaceRows } from "../shared/local-workspaces";
test("local state keeps active workspaces and excludes archiving rows", () => {
  assert.deepEqual(
    localWorkspaceRows([
      {
        id: "ready",
        name: "Ready",
        directory: "/fixture",
        kind: "directory",
        projectId: "project",
      },
      {
        id: "gone",
        directory: "/fixture/gone",
        archivingAt: "2026-11-23T00:00:00Z",
      },
    ]),
    [
      {
        workspaceId: "ready",
        name: "Ready",
        cwd: "/fixture",
        isolation: "directory",
        project: "project",
      },
    ],
  );
  assert.equal(
    localWorkspaceRows([null]),
    null,
    "a missing state cache keeps the RPC fallback",
  );
});

test("the local picker reads host state and cache updates without an RPC, with an older-screen fallback", async () => {
  const { build } = await import("esbuild");
  const bundle = await build({
    entryPoints: ["client/local-workspaces.ts"],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    external: ["react", "@getpaseo/plugin/client"],
  });
  let value = {
    id: "ready",
    name: "Ready",
    directory: "/fixture",
    kind: "directory",
    projectId: "project",
  };
  let supported = true,
    changes = 0,
    cleanup: (() => void) | undefined;
  const sdk = {
    useWorkspaces(query: { hosts: string[] }) {
      if (!supported) throw new Error("No screen state provider");
      assert.deepEqual(query.hosts, ["dev-box"]);
      return [{ id: "ready" }];
    },
    usePaseo: () => ({
      workspaces: {
        subscribe: () => {
          changes++;
          return () => {
            changes--;
          };
        },
        ref: () => ({ current: () => value }),
      },
    }),
  };
  const module = { exports: {} as { useLocalWorkspaces(host: string): any } };
  new Function("require", "module", "exports", bundle.outputFiles[0].text)(
    (id: string) =>
      id === "react"
        ? {
            useCallback: (fn: unknown) => fn,
            useSyncExternalStore: (
              subscribe: (listener: () => void) => () => void,
              read: () => string,
            ) => {
              cleanup ??= subscribe(() => {});
              return read();
            },
          }
        : sdk,
    module,
    module.exports,
  );
  assert.equal(module.exports.useLocalWorkspaces("dev-box")[0].name, "Ready");
  value = { ...value, name: "Renamed" };
  assert.equal(module.exports.useLocalWorkspaces("dev-box")[0].name, "Renamed");
  cleanup?.();
  assert.equal(changes, 0);
  supported = false;
  assert.equal(module.exports.useLocalWorkspaces("dev-box"), null);
});
