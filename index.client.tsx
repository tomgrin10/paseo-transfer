import { withButtonVisibility } from "./client/button-visibility";
import type {
  PluginButtonContentProps,
  PluginClientContext,
} from "@getpaseo/plugin/client";
import {
  TRANSFER_SCREEN,
  TransferPopover,
  TransferScreen,
} from "./client/screen";
import { TransferIcon } from "./client/header";
import { contributeWorkspaceButtons } from "./client/workspaces";
import { contributeDisplay } from "./client/display";
import { contributeChat } from "./client/chat";
import { registerHost } from "./client/federation";
export default function contribute(host: PluginClientContext) {
  const visibility = withButtonVisibility(host);
  const client = visibility.client;
  const releaseHost = registerHost(client);
  // Popups can't navigate; they open the screen, which opens the result on its host.
  const Popover = (props: PluginButtonContentProps) => (
    <TransferPopover
      {...props}
      openScreen={(input) => client.openScreen(input)}
    />
  );
  const screen = client.addScreen({
    id: TRANSFER_SCREEN,
    title: "Transfer",
    Component: TransferScreen,
  });
  const buttons = contributeWorkspaceButtons(client, Popover, TransferIcon);
  const display = contributeDisplay(client);
  const chat = contributeChat(client);
  const command = client.addCommandCenterItem({
    id: "transfer-workspace",
    title: "Transfer a workspace",
    icon: "ArrowRightLeft",
    keywords: ["copy", "move", "host", "ssh", "sync", "incoming"],
    context: "global",
    onSelect({ openScreen }) {
      openScreen({ screenId: TRANSFER_SCREEN });
    },
  });
  const here = client.addCommandCenterItem({
    id: "transfer-this-workspace",
    title: "Transfer this workspace",
    icon: "ArrowRightLeft",
    keywords: ["copy", "move", "host", "ssh", "sync"],
    context: "workspace",
    onSelect({ openScreen, workspace }) {
      openScreen({
        screenId: TRANSFER_SCREEN,
        params: { workspace: workspace.id },
      });
    },
  });
  return () => {
    visibility.dispose();
    releaseHost();
    command();
    here();
    chat();
    display();
    buttons();
    screen();
  };
}
