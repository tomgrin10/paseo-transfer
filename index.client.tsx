import type { PluginClientContext } from "@getpaseo/plugin/client";
import { TransferSurface, TransferPopover } from "./client/surface";
import { contributeWorkspaceButtons } from "./client/workspaces";
import { contributeDisplay } from "./client/display";
import { registerHost } from "./client/federation";
export default function contribute(client: PluginClientContext) {
  const releaseHost = registerHost(client);
  const surface = client.addSurface("transfer", TransferSurface);
  const buttons = contributeWorkspaceButtons(client, TransferPopover);
  const display = contributeDisplay(client);
  const command = client.addCommandCenterItem({
    id: "transfer-workspace",
    title: "Transfer a workspace",
    icon: "ArrowRightLeft",
    keywords: ["copy", "move", "host", "ssh", "sync"],
    context: "global",
    onSelect({ openSurface }) {
      openSurface("transfer");
    },
  });
  return () => {
    releaseHost();
    command();
    display();
    buttons();
    surface();
  };
}
