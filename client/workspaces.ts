import type {
  PluginButtonRegistration,
  PluginClientContext,
} from "@getpaseo/plugin/client";
import type { ComponentType } from "react";
import type { PluginButtonContentProps } from "@getpaseo/plugin/client";

/** Follow every open workspace without taking over the app's subscription. */
export function contributeWorkspaceButtons(
  client: PluginClientContext,
  Content: ComponentType<PluginButtonContentProps>,
) {
  const buttons = new Map<string, PluginButtonRegistration>();
  let disposed = false;
  let pending = false;
  let refreshAgain = false;

  const refresh = async () => {
    if (disposed) return;
    if (pending) {
      refreshAgain = true;
      return;
    }
    pending = true;
    try {
      const ids = new Set<string>();
      let cursor: string | undefined;
      do {
        const page = await client.paseo.workspaces.list({
          page: { limit: 100, ...(cursor ? { cursor } : {}) },
        });
        if (disposed) return;
        for (const workspace of page.entries) ids.add(workspace.id);
        cursor = page.pageInfo.hasMore
          ? (page.pageInfo.nextCursor ?? undefined)
          : undefined;
      } while (cursor);
      for (const [id, registration] of buttons) {
        if (!ids.has(id)) {
          registration.remove();
          buttons.delete(id);
        }
      }
      for (const workspaceId of ids) {
        if (!buttons.has(workspaceId)) {
          buttons.set(
            workspaceId,
            client.addHeaderButton({
              id: "transfer",
              workspaceId,
              button: {
                title: "Transfer this workspace",
                label: "Transfer",
                icon: "ArrowRightLeft",
                behavior: { kind: "popover", Content },
              },
            }),
          );
        }
      }
    } catch {
      // Keep existing buttons through disconnects; the next update/poll retries.
    } finally {
      pending = false;
      if (refreshAgain && !disposed) {
        refreshAgain = false;
        void refresh();
      }
    }
  };

  const unsubscribe = client.paseo.workspaces.subscribe(() => void refresh());
  void refresh();
  const timer = setInterval(() => void refresh(), 15_000);
  return () => {
    disposed = true;
    clearInterval(timer);
    unsubscribe();
    for (const registration of buttons.values()) registration.remove();
    buttons.clear();
  };
}
