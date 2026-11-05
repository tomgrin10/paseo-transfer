import { useEffect, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useHosts, useRpc } from "@getpaseo/plugin/client";
import { hostsRpc, listRpc, previewRpc, runRpc } from "../shared/rpc";
import type { Plan, Workspace } from "../shared/types";
import { classifyProblem, suggestedDestination } from "../shared/progress";
import { federation, hostAvailability, rpcForHost } from "./federation";
import { connectedTransfer, type ConnectedPlan } from "./connected-transfer";
import { runs, useLatestRun, useRun } from "./runs";

export type Direction = "push" | "pull";
export type Transport = "connected" | "ssh";
export type TransferModel = ReturnType<typeof useTransfer>;

/** What a preview found, for the receipt: conversations by provider, and ignored files when known. */
export interface Receipt {
  conversations: { provider: "claude" | "codex"; title: string }[] | null;
  hasIgnored: boolean | null;
}

export function receiptOf(plan: Plan): Receipt {
  if (!("connected" in plan)) return { conversations: null, hasIgnored: null };
  const manifest = (plan as ConnectedPlan).connected.manifest;
  return {
    conversations: manifest.sessions.map((session) => ({
      provider: session.provider,
      title: session.title,
    })),
    hasIgnored: manifest.hasIgnored,
  };
}

/**
 * Everything the popup and the screen share: hosts, workspace, folder, mode, the preview and the
 * run. Same rules as before the redesign: server IDs route every call, a sole ready host is picked,
 * any change discards the preview, and a run survives closing the popup.
 */
export function useTransfer({
  host,
  initialWorkspaceId = "",
  workspaceScoped = false,
}: {
  host: { id: string; label: string };
  initialWorkspaceId?: string;
  workspaceScoped?: boolean;
}) {
  const hosts = useRpc(hostsRpc),
    list = useRpc(listRpc),
    preview = useRpc(previewRpc),
    run = useRpc(runRpc);
  const inventory = useHosts();
  const hostRevision = useSyncExternalStore(
    federation.subscribe,
    federation.snapshot,
    federation.snapshot,
  );
  const connectedHosts = hostAvailability(inventory).filter(
    (item) => item.serverId !== host.id,
  );
  const [transport, setTransport] = useState<Transport>("connected");
  const [remoteId, setRemoteId] = useState("");
  const [remote, setRemote] = useState("");
  const [home, setHome] = useState("");
  const [identityFile, setIdentityFile] = useState("");
  const [direction, setDirection] = useState<Direction>("push");
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId);
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<"copy" | "move">("copy");
  const [plan, setPlan] = useState<Plan | null>(null);
  const popupKey = workspaceScoped ? `${host.id}:${initialWorkspaceId}` : "";
  const latest = useLatestRun(popupKey);
  const [runId, setRunId] = useState(() => latest?.runId ?? "");
  const current = useRun(runId);

  const selectedHost = connectedHosts.find(
    (item) => item.serverId === remoteId,
  );
  const remoteReady =
    transport === "connected"
      ? Boolean(selectedHost?.ready)
      : Boolean(remote.trim());
  const remoteLabel =
    transport === "connected"
      ? (selectedHost?.label ?? "another host")
      : remote.trim() || "the SSH host";
  const sourceId = direction === "push" ? host.id : remoteId;
  const targetId = direction === "push" ? remoteId : host.id;
  const sourceLabel = direction === "push" ? host.label : remoteLabel;
  const targetLabel = direction === "push" ? remoteLabel : host.label;

  const endpoint = {
    target: remote.trim(),
    ...(home.trim() ? { home: home.trim() } : {}),
    ...(identityFile.trim() ? { identityFile: identityFile.trim() } : {}),
  };
  const source = direction === "push" ? { target: "" } : endpoint,
    target = direction === "push" ? endpoint : { target: "" };
  const suggestions = useQuery({
    queryKey: ["transfer", host.id, "hosts"],
    queryFn: () => hosts({}),
    staleTime: 60_000,
    enabled: transport === "ssh",
  });
  const workspaces = useQuery({
    queryKey: [
      "transfer",
      host.id,
      "workspaces",
      transport,
      sourceId,
      selectedHost?.generation,
      source,
    ],
    queryFn: () =>
      transport === "connected" && direction === "pull"
        ? rpcForHost(sourceId)(listRpc, { endpoint: { target: "" } })
        : list({ endpoint: source }),
    enabled: direction === "push" || remoteReady,
    retry: 1,
  });
  const makePreview = useMutation({
    mutationFn: () =>
      transport === "connected"
        ? connectedTransfer.preview({
            sourceId,
            targetId,
            workspaceId,
            destination,
            mode,
          })
        : preview({ source, target, workspaceId, destination, mode }),
    onSuccess: (data) => {
      setPlan(data);
      if (runId) runs.detach(runId);
      setRunId("");
    },
  });
  const transfer = useMutation({
    mutationFn: async () =>
      "connected" in plan!
        ? connectedTransfer.start(plan as ConnectedPlan)
        : run({ planId: plan!.id }),
    onSuccess: (data) => {
      const started = plan!;
      runs.track({
        runId: data.runId,
        transport: "connected" in started ? "connected" : "ssh",
        hostId: host.id,
        key: popupKey,
        workspaceName: started.workspace.name,
        sourceLabel,
        targetLabel,
        // A connected run opens on its target; an SSH run only when it landed on this host.
        openOn:
          "connected" in started
            ? targetId
            : direction === "pull"
              ? host.id
              : null,
        mode: started.mode,
        destination: started.destination,
        files: started.files,
        sessions: started.sessions,
        bytes: started.bytes,
        startedAt: Date.now(),
      });
      setRunId(data.runId);
      setPlan(null);
    },
  });

  const running = current?.state === "running";
  const locked = running || transfer.isPending || makePreview.isPending;
  useEffect(() => {
    setPlan(null);
    makePreview.reset();
    transfer.reset();
  }, [
    remote,
    remoteId,
    transport,
    home,
    identityFile,
    direction,
    workspaceId,
    destination,
    mode,
  ]);
  useEffect(() => {
    if (plan && "connected" in plan)
      return () => {
        void connectedTransfer.discard(plan as ConnectedPlan);
      };
  }, [plan]);
  useEffect(() => {
    if (!remoteId && connectedHosts.filter((item) => item.ready).length === 1)
      setRemoteId(connectedHosts.find((item) => item.ready)!.serverId);
  }, [remoteId, inventory, hostRevision]);
  useEffect(() => {
    setWorkspaceId(direction === "push" ? initialWorkspaceId : "");
    setPlan(null);
    if (!workspaceScoped) setRunId("");
  }, [
    host.id,
    direction,
    direction === "pull" ? remote : "",
    direction === "pull" ? remoteId : "",
    home,
    initialWorkspaceId,
    workspaceScoped,
    transport,
  ]);
  const selectedWorkspace: Workspace | undefined =
    workspaces.data?.workspaces.find(
      (item) => item.workspaceId === workspaceId,
    );
  useEffect(() => {
    if (workspaceScoped && selectedWorkspace && !destination)
      setDestination(suggestedDestination(selectedWorkspace.cwd));
  }, [workspaceScoped, selectedWorkspace, destination]);

  const previewError = makePreview.error as Error | null;
  const problem = previewError
    ? classifyProblem(previewError.message, mode)
    : null;
  const startError = transfer.error as Error | null;
  const listError =
    (workspaces.error as Error | null) ??
    (transport === "ssh" ? (suggestions.error as Error | null) : null);
  // A Move refused for ignored files has one fix, Copy; previewing the same Move again would only repeat it.
  const blockedMove = problem?.action === "use-copy";
  const canPreview =
    !blockedMove &&
    !locked &&
    remoteReady &&
    !!workspaceId &&
    !!destination.trim() &&
    (!workspaceScoped || !!selectedWorkspace);

  return {
    host,
    workspaceScoped,
    // hosts
    connectedHosts,
    transport,
    setTransport,
    remoteId,
    setRemoteId,
    remote,
    setRemote,
    home,
    setHome,
    identityFile,
    setIdentityFile,
    suggestions: suggestions.data?.hosts ?? [],
    selectedHost,
    remoteReady,
    sourceLabel,
    targetLabel,
    // what
    direction,
    setDirection,
    workspaces,
    workspaceId,
    selectWorkspace(item: Workspace) {
      setWorkspaceId(item.workspaceId);
      setDestination(suggestedDestination(item.cwd));
    },
    selectedWorkspace,
    destination,
    setDestination,
    mode,
    setMode,
    // preview and run
    plan,
    receipt: plan ? receiptOf(plan) : null,
    discardPlan: () => setPlan(null),
    previewing: makePreview.isPending,
    preview: () => makePreview.mutate(),
    canPreview,
    problem,
    blockedMove,
    starting: transfer.isPending,
    start: () => transfer.mutate(),
    startError,
    listError,
    locked,
    runId,
    run: current,
    clearRun() {
      if (runId) runs.detach(runId);
      setRunId("");
    },
  };
}
