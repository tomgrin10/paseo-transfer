import type { PluginServerContext } from "@getpaseo/plugin/server";
import { hostsRpc, listRpc, previewRpc, runRpc, statusRpc } from "./shared/rpc";
import { displayPreferences } from "./shared/display";
import {
  hosts,
  list,
  preview,
  start,
  status,
  dispose,
} from "./server/handlers";
export default function contribute(server: PluginServerContext) {
  server.registerSettings(displayPreferences);
  server.handle(hostsRpc, hosts);
  server.handle(listRpc, list);
  server.handle(previewRpc, preview);
  server.handle(runRpc, start);
  server.handle(statusRpc, status);
  return dispose;
}
