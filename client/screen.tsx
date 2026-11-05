import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type {
  PluginButtonContentProps,
  PluginOpenScreenInput,
  PluginScreenProps,
} from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import { suggestedDestination } from "../shared/progress";
import { Button, Card, IconButton, text } from "./kit";
import { PressScale, Skeleton, Spinner } from "./motion";
import {
  Field,
  FolderField,
  HostSection,
  ModeField,
  ProblemNote,
  ReceiptRow,
  Segmented,
} from "./parts";
import {
  FrameTheme,
  PopupForm,
  ReceiptView,
  RunPanel,
  SessionRuns,
} from "./flow";
import { useRuns, type RunView } from "./runs";
import { mono, type Theme } from "./theme";
import { useTransfer, type TransferModel } from "./use-transfer";

export const TRANSFER_SCREEN = "transfer";

/** Opens a finished transfer's workspace on its host; popups can't navigate, screens can. */
function openParams(run: RunView): PluginOpenScreenInput {
  return {
    screenId: TRANSFER_SCREEN,
    params: {
      open: run.result!.workspaceId,
      server: run.openOn!,
      name: run.workspaceName,
      on: run.targetLabel,
    },
  };
}

/** The header button's popup: this workspace, already selected. */
export function TransferPopover({
  openScreen,
  ...props
}: PluginButtonContentProps & {
  openScreen(input: PluginOpenScreenInput): void;
}) {
  const compact = props.layout.compact;
  const m = useTransfer({
    host: props.host,
    initialWorkspaceId: props.workspaceId,
    workspaceScoped: true,
  });
  const run = m.run;
  return (
    <FrameTheme value={props.theme.colors.border}>
      <View
        testID="transfer-popup"
        style={
          compact
            ? { paddingBottom: 12, paddingHorizontal: 4 }
            : // One width for every state, so the popup never jumps as it moves on.
              { width: 384, maxWidth: "100%", paddingVertical: 2 }
        }
      >
        {run ? (
          <RunPanel
            run={run}
            theme={props.theme}
            compact={compact}
            pinned={!compact}
            onNew={m.clearRun}
            onOpen={
              run.openOn && run.result
                ? () => {
                    props.close();
                    openScreen(openParams(run));
                  }
                : undefined
            }
          />
        ) : m.plan ? (
          <ReceiptView
            m={m}
            theme={props.theme}
            compact={compact}
            pinned={!compact}
          />
        ) : (
          <PopupForm
            m={m}
            theme={props.theme}
            compact={compact}
            pinned={!compact}
          />
        )}
      </View>
    </FrameTheme>
  );
}

function WorkspaceList({
  m,
  theme,
  compact,
}: {
  m: TransferModel;
  theme: Theme;
  compact: boolean;
}) {
  const c = theme.colors;
  const t = text(c);
  const items = m.workspaces.data?.workspaces ?? [];
  const label = `Workspace on ${m.sourceLabel}`;
  const refresh = (
    <IconButton
      theme={theme}
      icon="RefreshCw"
      label="Refresh workspaces"
      compact={compact}
      onPress={() => void m.workspaces.refetch()}
      disabled={m.locked || (m.direction === "pull" && !m.remoteReady)}
    />
  );
  let body;
  if (m.direction === "pull" && !m.remoteReady)
    body = (
      <Text style={t.meta}>
        Choose the host above to see its open workspaces.
      </Text>
    );
  else if (m.workspaces.isPending)
    body = (
      <Card theme={theme}>
        {[0.62, 0.48, 0.55].map((w, i) => (
          <View key={i} style={{ padding: 12, gap: 7 }}>
            <Skeleton width={`${w * 100}%`} height={10} color={c.surface2} />
            <Skeleton width={`${w * 70}%`} height={8} color={c.surface2} />
          </View>
        ))}
      </Card>
    );
  else if (m.workspaces.error)
    body = (
      <ProblemNote
        theme={theme}
        problem={{
          place: "general",
          title: `Couldn't list workspaces on ${m.sourceLabel}`,
          message: (m.workspaces.error as Error).message,
        }}
      />
    );
  else if (!items.length)
    body = (
      <Text style={t.meta}>
        No open workspaces on {m.sourceLabel}. Open one in Paseo, then refresh.
      </Text>
    );
  else
    body = (
      <Card theme={theme} style={{ maxHeight: 290 }}>
        <ScrollView nestedScrollEnabled>
          {items.map((item, index) => {
            const on = item.workspaceId === m.workspaceId;
            return (
              <View key={item.workspaceId}>
                {index ? (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: c.border,
                      opacity: 0.6,
                    }}
                  />
                ) : null}
                <PressScale
                  accessibilityRole="radio"
                  accessibilityLabel={`${item.name}, ${item.cwd}`}
                  accessibilityState={{
                    selected: on,
                    checked: on,
                    disabled: m.locked,
                  }}
                  disabled={m.locked}
                  onPress={() => m.selectWorkspace(item)}
                  style={({ hovered }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 12,
                    paddingVertical: compact ? 12 : 9,
                    backgroundColor: on
                      ? c.surface2
                      : hovered && !m.locked
                        ? c.surface1
                        : "transparent",
                  })}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text
                      numberOfLines={1}
                      style={[t.body, { fontWeight: "600" }]}
                    >
                      {item.name}
                    </Text>
                    <Text numberOfLines={1} style={[t.meta, mono]}>
                      {item.cwd}
                    </Text>
                  </View>
                  {on ? (
                    <Icon name="Check" size={15} color={c.foreground} />
                  ) : null}
                </PressScale>
              </View>
            );
          })}
        </ScrollView>
      </Card>
    );
  return (
    <Field theme={theme} label={label} trailing={refresh}>
      {body}
    </Field>
  );
}

/** Before a preview: what a transfer carries, so the right side is never empty. */
function WhatTravels({ m, theme }: { m: TransferModel; theme: Theme }) {
  const c = theme.colors;
  const t = text(c);
  return (
    <Card theme={theme}>
      <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 }}>
        <Text accessibilityRole="header" style={t.group}>
          What travels
        </Text>
        <ReceiptRow
          theme={theme}
          icon="GitBranch"
          title="Git history"
          detail="Every local branch and tag, unpushed commits included"
        />
        <ReceiptRow
          theme={theme}
          icon="Files"
          title="Working tree"
          detail="Staged, unstaged and untracked changes"
        />
        <ReceiptRow
          theme={theme}
          icon="MessagesSquare"
          title="Claude and Codex conversations"
          detail={`Imported on ${m.targetLabel} as agents you can resume`}
        />
      </View>
      <View style={{ height: 1, backgroundColor: c.border, opacity: 0.7 }} />
      <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 }}>
        <Text accessibilityRole="header" style={t.group}>
          Stays on {m.sourceLabel}
        </Text>
        <ReceiptRow
          theme={theme}
          muted
          icon="EyeOff"
          title="Git-ignored files"
          detail="Such as .env and dependencies"
        />
        <ReceiptRow
          theme={theme}
          muted
          icon="KeyRound"
          title="Sign-ins, MCP and launch settings"
          detail="Each host uses its own"
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: c.surface1,
        }}
      >
        <Icon name="ScanSearch" size={13} color={c.foregroundMuted} />
        <Text style={[t.meta, { flex: 1 }]}>
          Preview lists the exact files and conversations before anything moves.
        </Text>
      </View>
    </Card>
  );
}

function Handoff({
  theme,
  params,
  navigation,
}: Pick<PluginScreenProps, "theme" | "params" | "navigation">) {
  const c = theme.colors;
  const t = text(c);
  const open = () =>
    navigation?.openWorkspace({
      workspaceId: params.open!,
      serverId: params.server,
    });
  useEffect(() => {
    open();
  }, [params.open, params.server]);
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 12,
        backgroundColor: c.surface0,
      }}
    >
      {navigation ? <Spinner color={c.foreground} size={16} /> : null}
      <Text style={[t.title, { textAlign: "center" }]}>
        Opening {params.name ?? "the workspace"} on {params.on ?? "its host"}…
      </Text>
      {navigation ? (
        <Button
          theme={theme}
          title={`Open on ${params.on ?? "its host"}`}
          icon="SquareArrowOutUpRight"
          onPress={open}
        />
      ) : (
        <Text style={[t.meta, { textAlign: "center" }]}>
          Open it from the sidebar under {params.on ?? "the other host"}.
        </Text>
      )}
    </View>
  );
}

/** ⌘K → Transfer: both directions, every open workspace, and this session's transfers. */
export function TransferScreen(props: PluginScreenProps) {
  const { theme, navigation, params } = props;
  if (params.open)
    return <Handoff theme={theme} params={params} navigation={navigation} />;
  return <TransferWorkspace {...props} />;
}

function TransferWorkspace({
  theme,
  layout,
  host,
  navigation,
  params,
}: PluginScreenProps) {
  const c = theme.colors;
  const [width, setWidth] = useState(0);
  const wide = width >= 860;
  const compact = layout.compact;
  const m = useTransfer({
    host,
    initialWorkspaceId: params.workspace ?? "",
  });
  const list = useRuns();
  const [viewing, setViewing] = useState("");
  useEffect(() => {
    if (m.runId) setViewing(m.runId);
  }, [m.runId]);
  useEffect(() => {
    if (!m.destination && m.selectedWorkspace)
      m.setDestination(suggestedDestination(m.selectedWorkspace.cwd));
  }, [m.selectedWorkspace?.workspaceId]);
  const run = list.find((item) => item.runId === viewing);
  const closeRun = () => {
    if (run?.runId === m.runId) m.clearRun();
    setViewing("");
  };
  const onOpen =
    run?.openOn && run.result && navigation
      ? () =>
          navigation.openWorkspace({
            workspaceId: run.result!.workspaceId,
            serverId: run.openOn!,
          })
      : undefined;
  const generalProblem =
    m.problem && !["destination", "mode"].includes(m.problem.place)
      ? m.problem
      : null;

  const setup = (
    <View style={{ gap: 22 }}>
      <Segmented
        theme={theme}
        label="Direction"
        value={m.direction}
        onChange={(value) => m.setDirection(value)}
        disabled={m.locked}
        compact={compact}
        options={[
          { value: "push", label: `Send from ${host.label}`, icon: "Upload" },
          {
            value: "pull",
            label: `Bring to ${host.label}`,
            icon: "Download",
          },
        ]}
      />
      <HostSection
        m={m}
        theme={theme}
        compact={compact}
        label={m.direction === "push" ? "To" : "From"}
        showOptions={wide}
      />
      <WorkspaceList m={m} theme={theme} compact={compact} />
      <FolderField m={m} theme={theme} compact={compact} />
      <ModeField m={m} theme={theme} compact={compact} />
      {generalProblem ? (
        <ProblemNote theme={theme} problem={generalProblem} />
      ) : null}
      {wide && m.plan ? null : (
        <Button
          theme={theme}
          kind={m.plan ? "secondary" : "primary"}
          grow={compact}
          compact={compact}
          icon={m.previewing ? undefined : "ScanSearch"}
          loading={m.previewing}
          title={m.previewing ? "Checking both hosts…" : "Preview transfer"}
          onPress={m.preview}
          disabled={!m.canPreview}
        />
      )}
    </View>
  );
  const sessions = (
    <SessionRuns
      theme={theme}
      list={list}
      selected={run?.runId}
      onSelect={(item) => setViewing(item.runId)}
    />
  );
  const panel = run ? (
    <RunPanel
      run={run}
      theme={theme}
      compact={compact}
      onNew={closeRun}
      onOpen={onOpen}
      footnote={run.state === "running"}
    />
  ) : m.plan ? (
    <ReceiptView m={m} theme={theme} compact={compact} back={!wide} />
  ) : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface0 }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      contentContainerStyle={{
        paddingHorizontal: compact ? 16 : 28,
        paddingTop: compact ? 16 : 28,
        paddingBottom: 56,
      }}
    >
      {wide ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 32,
            width: "100%",
            maxWidth: 1080,
            alignSelf: "center",
          }}
        >
          <View style={{ flex: 11, minWidth: 0 }}>{setup}</View>
          <View style={{ flex: 10, minWidth: 0, gap: 22 }}>
            {panel ?? <WhatTravels m={m} theme={theme} />}
            {sessions}
          </View>
        </View>
      ) : (
        <View
          style={{
            gap: 22,
            width: "100%",
            maxWidth: 640,
            alignSelf: "center",
          }}
        >
          {panel ?? setup}
          {sessions}
        </View>
      )}
    </ScrollView>
  );
}
