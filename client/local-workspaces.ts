import * as sdk from "@getpaseo/plugin/client";
import { useCallback, useSyncExternalStore } from "react";
import { localWorkspaceRows } from "../shared/local-workspaces";

/** Current clients supply host state in screens; older hosts retain the RPC source picker. */
export function useLocalWorkspaces(hostId: string) {
  const hooks = sdk as typeof sdk & {
    useWorkspaces?: (query: { hosts: string[] }) => readonly { id: string }[];
  };
  let refs: readonly { id: string }[] | null = null;
  let api: ReturnType<typeof sdk.usePaseo> | null = null;
  try {
    if (
      typeof hooks.useWorkspaces === "function" &&
      typeof sdk.usePaseo === "function"
    ) {
      refs = hooks.useWorkspaces({ hosts: [hostId] });
      api = sdk.usePaseo();
    }
  } catch {
    /* No state provider in older plugin screens. */
  }
  const source = api?.workspaces;
  const subscribe = useCallback(
    (listener: () => void) => source?.subscribe(listener) ?? (() => {}),
    [source],
  );
  const read = () => {
    if (!source || refs === null) return "null";
    try {
      return JSON.stringify(
        localWorkspaceRows(refs.map((ref) => source.ref(ref.id).current())),
      );
    } catch {
      return "null";
    }
  };
  // The collection hook tracks membership; the SDK's local stream also updates names and directories.
  const snapshot = useSyncExternalStore(subscribe, read, () => "null");
  return JSON.parse(snapshot) as ReturnType<typeof localWorkspaceRows>;
}
