import { test } from "node:test";
import assert from "node:assert/strict";
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { contributeWorkspaceButtons } from "../client/workspaces";
import { displayPreferences } from "../shared/display";

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
const Content = () => null;

test("Transfer buttons follow all workspace pages, keep one registration, and remove closed workspaces", async (t) => {
  let update: () => void = () => {};
  let subscribed = true;
  let ids = ["a", "b"];
  const added: string[] = [];
  const removed: string[] = [];
  const client = {
    paseo: {
      workspaces: {
        subscribe(fn: () => void) {
          update = fn;
          return () => {
            subscribed = false;
          };
        },
        async list(input: { page: { cursor?: string } }) {
          const second = input.page.cursor === "next";
          return {
            entries: (second ? ids.slice(1) : ids.slice(0, 1)).map((id) => ({
              id,
            })),
            pageInfo: {
              hasMore: !second && ids.length > 1,
              nextCursor: !second && ids.length > 1 ? "next" : null,
            },
          };
        },
      },
    },
    addHeaderButton(input: {
      workspaceId: string;
      button: { label: string; behavior: { kind: string; Content: unknown } };
    }) {
      assert.equal(input.button.label, "Transfer");
      assert.equal(input.button.behavior.kind, "popover");
      assert.equal(input.button.behavior.Content, Content);
      added.push(input.workspaceId);
      return {
        remove() {
          removed.push(input.workspaceId);
        },
      };
    },
  } as unknown as PluginClientContext;
  const dispose = contributeWorkspaceButtons(client, Content);
  t.after(dispose);
  await settle();
  assert.deepEqual(added, ["a", "b"]);
  update();
  await settle();
  assert.deepEqual(added, ["a", "b"]);
  ids = ["b", "c"];
  update();
  await settle();
  assert.deepEqual(added, ["a", "b", "c"]);
  assert.deepEqual(removed, ["a"]);
  dispose();
  assert.equal(subscribed, false);
  assert.deepEqual(removed, ["a", "b", "c"]);
  update();
  await settle();
  assert.equal(added.length, 3);
});

test("late workspace responses cannot register buttons after unload", async () => {
  let finish: (value: unknown) => void = () => {};
  let additions = 0;
  const client = {
    paseo: {
      workspaces: {
        subscribe() {
          return () => {};
        },
        list() {
          return new Promise((resolve) => {
            finish = resolve;
          });
        },
      },
    },
    addHeaderButton() {
      additions += 1;
    },
  } as unknown as PluginClientContext;
  const dispose = contributeWorkspaceButtons(client, Content);
  dispose();
  finish({ entries: [{ id: "a" }], pageInfo: { hasMore: false } });
  await settle();
  assert.equal(additions, 0);
});

test("a failed paginated refresh keeps existing buttons until a complete report arrives", async (t) => {
  let update: () => void = () => {};
  let fail = false;
  let removed = 0;
  const client = {
    paseo: {
      workspaces: {
        subscribe(fn: () => void) {
          update = fn;
          return () => {};
        },
        async list(input: { page: { cursor?: string } }) {
          if (fail && input.page.cursor) throw new Error("Disconnected");
          return {
            entries: [{ id: "a" }],
            pageInfo: { hasMore: fail, nextCursor: fail ? "next" : null },
          };
        },
      },
    },
    addHeaderButton() {
      return {
        remove() {
          removed += 1;
        },
      };
    },
  } as unknown as PluginClientContext;
  const dispose = contributeWorkspaceButtons(client, Content);
  t.after(dispose);
  await settle();
  fail = true;
  update();
  await settle();
  assert.equal(removed, 0);
});

test("Transfer defaults to workspace navigation with the sidebar hidden", () => {
  assert.equal(displayPreferences.schema.parse({}).showSidebar, false);
  assert.equal(
    displayPreferences.schema.parse({ showSidebar: true }).showSidebar,
    true,
  );
});

test("an owned workspace stream replaces the periodic button refresh and releases on unload", async () => {
  const originalInterval = globalThis.setInterval;
  const originalClear = globalThis.clearInterval;
  let intervals = 0,
    releases = 0,
    removed = 0,
    observer: any;
  let ids = ["one"];
  const added: string[] = [];
  globalThis.setInterval = ((..._args: any[]) => {
    intervals++;
    return 1 as any;
  }) as any;
  globalThis.clearInterval = (() => {}) as any;
  try {
    const client = {
      paseo: {
        workspaces: {
          subscribe: () => () => {},
          list: async (input: any) => ({
            entries: ids.map((id) => ({ id })),
            pageInfo: { hasMore: false },
            ...(input.subscribe
              ? {
                  subscription: {
                    subscribe(value: any) {
                      observer = value;
                      return () => {
                        removed++;
                      };
                    },
                    async release() {
                      releases++;
                    },
                  },
                }
              : {}),
          }),
        },
      },
      addHeaderButton(input: any) {
        added.push(input.workspaceId);
        return { remove() {} };
      },
    };
    const stop = contributeWorkspaceButtons(
      client as never,
      (() => null) as never,
    );
    for (let i = 0; i < 12; i++) await Promise.resolve();
    assert.equal(
      intervals,
      0,
      "a healthy owned stream never starts the 15 s poll",
    );
    ids = ["one", "two"];
    observer.update();
    for (let i = 0; i < 12; i++) await Promise.resolve();
    assert.deepEqual(added, ["one", "two"]);
    stop();
    for (let i = 0; i < 4; i++) await Promise.resolve();
    assert.equal(releases, 1);
    assert.equal(removed, 1);
  } finally {
    globalThis.setInterval = originalInterval;
    globalThis.clearInterval = originalClear;
  }
});
