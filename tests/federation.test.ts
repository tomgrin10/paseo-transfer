import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFederation,
  federation,
  rpcForHost,
  hostAvailability,
  type HostRpc,
} from "../client/federation";
import { hostIdentity } from "../shared/connected";

test("replaced host capabilities survive old cleanup and requests reacquire the current installation", async () => {
  const registry = createFederation();
  const oldRpc = (async () => ({ serverId: "old", protocol: 1 })) as HostRpc;
  const newRpc = (async () => ({ serverId: "new", protocol: 1 })) as HostRpc;
  const removeOld = registry.register("same-host", oldRpc);
  const removeNew = registry.register("same-host", newRpc);
  removeOld();
  assert.equal(registry.get("same-host")?.rpc, newRpc);
  removeNew();
  assert.equal(registry.get("same-host"), undefined);

  const rpc = rpcForHost("fixture-host");
  const old = federation.register("fixture-host", oldRpc);
  assert.equal((await rpc(hostIdentity, {})).serverId, "old");
  const current = federation.register("fixture-host", newRpc);
  old();
  assert.equal((await rpc(hostIdentity, {})).serverId, "new");
  current();
  assert.throws(() => rpc(hostIdentity, {}), /unavailable/);
});

test("matching host names never substitute for server identity or offline state", () => {
  const remove = federation.register("ready", (async () => ({})) as HostRpc);
  try {
    const hosts = hostAvailability([
      { serverId: "ready", label: "Laptop", status: "online" },
      { serverId: "missing", label: "Laptop", status: "online" },
      { serverId: "ready", label: "Laptop", status: "offline" },
    ]);
    assert.deepEqual(
      hosts.map((host) => host.ready),
      [true, false, false],
    );
  } finally {
    remove();
  }
});
