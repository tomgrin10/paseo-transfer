import { withButtonVisibility } from "./client/button-visibility";
import { withNavigation } from "./client/navigation";
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { TransferSurface, TransferPopover } from "./client/surface";
import { contributeWorkspaceButtons } from "./client/workspaces";
import { contributeDisplay } from "./client/display";
import { registerHost } from "./client/federation";
export default function contribute(host: PluginClientContext) {
  const visibility = withButtonVisibility(host);
  const client = visibility.client;
  const releaseHost = registerHost(client);
  const surface = client.addSurface(
    "transfer",
    withNavigation(TransferSurface, client, "transfer"),
  );
  const buttons = contributeWorkspaceButtons(
    client,
    withNavigation(TransferPopover, client, "transfer"),
  );
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
    visibility.dispose();
    releaseHost();
    command();
    display();
    buttons();
    surface();
  };
}
