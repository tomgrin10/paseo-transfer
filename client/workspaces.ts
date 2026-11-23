import type {
  PluginButtonRegistration,
  PluginClientContext,
} from "@getpaseo/plugin/client";
import type { ComponentType } from "react";
import type {
  PluginButtonContentProps,
  PluginButtonIcon,
} from "@getpaseo/plugin/client";

/** Follow every open workspace without taking over the app's subscription. */
export function contributeWorkspaceButtons(
  client: PluginClientContext,
  Content: ComponentType<PluginButtonContentProps>,
  icon: PluginButtonIcon = "ArrowRightLeft",
) {
  const buttons = new Map<string, PluginButtonRegistration>();
  let disposed = false;
  let pending = false;
  let refreshAgain = false;
  let triedObservation = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let offObservation: (() => void) | undefined;
  let observation: { release(): Promise<void> } | undefined;
  const stopPoll = () => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };
  const startPoll = () => {
    if (!disposed && timer === undefined)
      timer = setInterval(() => void refresh(), 15_000);
  };

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
        const options = { page: { limit: 100, ...(cursor ? { cursor } : {}) } };
        const observe = !triedObservation && !cursor;
        triedObservation = true;
        const page = observe
          ? await client.paseo.workspaces.list({ ...options, subscribe: {} })
          : await client.paseo.workspaces.list(options);
        const owned = (
          page as typeof page & {
            subscription?: {
              release(): Promise<void>;
              subscribe(observer: {
                snapshot(): void;
                update(): void;
                error(): void;
              }): () => void;
            };
          }
        ).subscription;
        if (disposed) {
          await owned?.release();
          return;
        }
        if (owned && !observation) {
          observation = owned;
          stopPoll();
          offObservation = owned.subscribe({
            snapshot: () => {
              stopPoll();
              void refresh();
            },
            update: () => void refresh(),
            error: startPoll,
          });
        } else if (!observation) startPoll();
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
                icon,
                behavior: { kind: "popover", Content },
              },
            }),
          );
        }
      }
    } catch {
      // Keep existing buttons through disconnects; older hosts retain the RPC poll.
      startPoll();
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

  return () => {
    disposed = true;
    stopPoll();
    offObservation?.();
    void observation?.release().catch(() => undefined);
    unsubscribe();
    for (const registration of buttons.values()) registration.remove();
    buttons.clear();
  };
}
