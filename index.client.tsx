import type { PluginClientContext } from "@getpaseo/plugin/client";
import { TransferSurface, TransferPopover } from "./client/surface";
import { contributeWorkspaceButtons } from "./client/workspaces";
import { contributeDisplay } from "./client/display";
export default function contribute(client: PluginClientContext) {
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
    command();
    display();
    buttons();
    surface();
  };
}
