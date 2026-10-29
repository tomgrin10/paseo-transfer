import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
async function tools(stubs = {}, read) {
  const bundle = await build({ entryPoints: ["server/native-tools.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "fixture-services", setup(build) { build.onResolve({ filter: /^\./ }, args => Object.hasOwn(stubs, args.path) ? { path: "fixture:" + args.path, external: true } : undefined); } }] });
  const module = { exports: {} };
  new Function("require", "module", "exports", bundle.outputFiles[0].text)(id => id.startsWith("fixture:") ? stubs[id.slice(8)] : require(id), module, module.exports);
  let open;
  module.exports.contributeAgentTools({ before(name, handler) { assert.equal(name, "agent.session_open"); open = handler; return () => {}; } }, read);
  const request = { purpose: "interactive", provider: "claude", labels: {}, workspaceId: "w1", tools: [] };
  return { definitions: open({ request }).tools, module: module.exports };
}
const context = () => ({ agent: { id: "caller", workspaceId: "w1", provider: "claude", cwd: "/fixture", title: "Fixture" }, paseo: {}, signal: new AbortController().signal });
async function call(tool, input, ctx = context()) { return tool.execute(tool.input.parse(input), ctx); }
test("transfer tools only discover destinations and read an existing run", async () => {
  let started = false;
  const { definitions } = await tools({ "./handlers": { hosts: async () => ({ hosts: [{ target: "fixture" }] }), status: ({ runId }) => ({ state: "done", runId }), start: () => { started = true; } } });
  assert.deepEqual(definitions.map(t => t.name), ["transfer_list_hosts", "transfer_run_status"]);
  assert.equal((await call(definitions[0], {})).structuredContent.hosts.length, 1);
  assert.equal((await call(definitions[1], { runId: "known-run" })).structuredContent.runId, "known-run"); assert.equal(started, false);
});
