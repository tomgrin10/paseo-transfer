import { contributeAgentTools } from "./server/native-tools";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { hostsRpc, listRpc, previewRpc, runRpc, statusRpc } from "./shared/rpc";
import { displayPreferences } from "./shared/display";
import { contributeConnected } from "./server/connected";
import {
  hosts,
  list,
  preview,
  start,
  status,
  dispose,
} from "./server/handlers";
export default function contribute(server: PluginServerContext) {
  const removeTools = contributeAgentTools(server);
  const releaseConnected = contributeConnected(server);
  server.registerSettings(displayPreferences);
  server.handle(hostsRpc, hosts);
  server.handle(listRpc, list);
  server.handle(previewRpc, preview);
  server.handle(runRpc, start);
  server.handle(statusRpc, status);
  return async () => {
    removeTools();
    dispose();
    await releaseConnected();
  };
}
