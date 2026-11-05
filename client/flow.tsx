import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ScrollView, Text, View } from "react-native";
import { Icon } from "@getpaseo/plugin/client/ui";
import { formatDuration, plural } from "../shared/progress";
import { Button, Card, text } from "./kit";
import { PressScale, Reveal, Spinner } from "./motion";
import {
  Elapsed,
  FolderField,
  HostSection,
  ModeField,
  OutcomeMark,
  ProblemNote,
  ReceiptCard,
  Route,
  StageRail,
} from "./parts";
import { runs, type RunView } from "./runs";
import { mono, type Theme } from "./theme";
import type { TransferModel } from "./use-transfer";

const verb = (mode: "copy" | "move") => (mode === "move" ? "Move" : "Copy");
const past = (mode: "copy" | "move") => (mode === "move" ? "Moved" : "Copied");
const ing = (mode: "copy" | "move") => (mode === "move" ? "Moving" : "Copying");

/** Primary on the right, full width on phones; a secondary sits beside it. */
export function Actions({
  compact,
  children,
}: {
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: compact ? "column-reverse" : "row",
        flexWrap: compact ? "nowrap" : "wrap",
        justifyContent: "flex-end",
        alignItems: compact ? "stretch" : "center",
        gap: 8,
      }}
    >
      {children}
    </View>
  );
}

/**
 * A state's body with its actions. In the desktop popup (a fixed-height scroll box) the body
 * scrolls on its own and the actions stay pinned below it, so the primary is never cut off.
 */
const FrameColor = createContext<string | null>(null);
const useFrameColors = () => useContext(FrameColor);
/** Lets the pinned frame draw its hairline in the host's border colour. */
export const FrameTheme = FrameColor.Provider;

export function Frame({
  pinned = false,
  gap = 14,
  children,
  notice,
  actions,
}: {
  pinned?: boolean;
  gap?: number;
  children: ReactNode;
  /** A problem to keep in view: pinned above the actions in the popup. */
  notice?: ReactNode;
  actions?: ReactNode;
}) {
  const [box, setBox] = useState({ view: 0, content: 0, notice: 0 });
  const c = useFrameColors();
  if (!pinned)
    return (
      <View style={{ gap }}>
        {children}
        {notice}
        {actions}
      </View>
    );
  // The body gets what the popup's fixed box leaves after the pinned notice and actions.
  const room = (actions ? 356 : 408) - (notice ? box.notice + 12 : 0);
  const scrolls = box.content > box.view + 1;
  return (
    <View style={{ gap: 12 }}>
      <ScrollView
        style={{ maxHeight: Math.max(160, room), flexGrow: 0 }}
        contentContainerStyle={{ gap }}
        onLayout={(event) => {
          const view = event.nativeEvent.layout.height;
          setBox((value) => (value.view === view ? value : { ...value, view }));
        }}
        onContentSizeChange={(_, content) =>
          setBox((value) =>
            value.content === content ? value : { ...value, content },
          )
        }
      >
        {children}
      </ScrollView>
      {/* A hairline says the body continues above when it scrolls. */}
      {scrolls && c ? (
        <View style={{ height: 1, marginTop: -6, backgroundColor: c }} />
      ) : null}
      {notice ? (
        <View
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            setBox((value) =>
              value.notice === height ? value : { ...value, notice: height },
            );
          }}
        >
          {notice}
        </View>
      ) : null}
      {actions}
    </View>
  );
}

export function StateTitle({
  theme,
  title,
  trailing,
  leading,
}: {
  theme: Theme;
  title: string;
  trailing?: ReactNode;
  leading?: ReactNode;
}) {
  const c = theme.colors;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {leading}
      <Text
        accessibilityRole="header"
        style={{
          flex: 1,
          color: c.foreground,
          fontSize: 17,
          lineHeight: 23,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}

/** The popup's form: the workspace, where it goes, the new folder, copy or move. */
export function PopupForm({
  m,
  theme,
  compact,
  pinned,
}: {
  m: TransferModel;
  theme: Theme;
  compact: boolean;
  pinned?: boolean;
}) {
  const c = theme.colors;
  const t = text(c);
  const ws = m.selectedWorkspace;
  const gone =
    !m.workspaces.isPending && !m.workspaces.error && !m.selectedWorkspace;
  // In the popup every preview problem sits right above the button; inline otherwise.
  const generalProblem =
    m.problem && (pinned || !["destination", "mode"].includes(m.problem.place))
      ? m.problem
      : null;
  return (
    <Frame
      pinned={pinned}
      gap={16}
      notice={
        generalProblem ? (
          <ProblemNote
            theme={theme}
            problem={generalProblem}
            compact={compact}
            onAction={() => m.setMode("copy")}
          />
        ) : null
      }
      actions={
        <Button
          theme={theme}
          kind="primary"
          grow
          compact={compact}
          icon={m.previewing ? undefined : "ScanSearch"}
          loading={m.previewing}
          title={m.previewing ? "Checking both hosts…" : "Preview transfer"}
          onPress={m.preview}
          disabled={!m.canPreview}
        />
      }
    >
      <View style={{ gap: 2 }}>
        <Text numberOfLines={2} style={[t.title]}>
          {ws?.name ?? (gone ? "Workspace not found" : "Loading workspace…")}
        </Text>
        <Text numberOfLines={1} style={[t.meta, mono]}>
          {ws?.cwd ?? `On ${m.host.label}`}
        </Text>
      </View>
      {gone ? (
        <ProblemNote
          theme={theme}
          problem={{
            place: "general",
            title: "This workspace is no longer open",
            message: "Reopen it in Paseo, then try again.",
          }}
        />
      ) : null}
      {m.listError ? (
        <ProblemNote
          theme={theme}
          problem={{
            place: "general",
            title: "Couldn't read this host's workspaces",
            message: m.listError.message,
          }}
        />
      ) : null}
      <HostSection m={m} theme={theme} compact={compact} label="Send to" />
      <FolderField m={m} theme={theme} compact={compact} inline={!pinned} />
      <ModeField m={m} theme={theme} compact={compact} inline={!pinned} />
    </Frame>
  );
}

/** What the preview found, then the one action that starts it. */
export function ReceiptView({
  m,
  theme,
  compact,
  back = true,
  pinned,
}: {
  m: TransferModel;
  theme: Theme;
  compact: boolean;
  back?: boolean;
  pinned?: boolean;
}) {
  const plan = m.plan!;
  const actions = (
    <Actions compact={compact}>
      {back ? (
        <Button
          theme={theme}
          title="Back"
          icon="ArrowLeft"
          compact={compact}
          grow={compact}
          onPress={m.discardPlan}
          disabled={m.starting}
        />
      ) : null}
      <Button
        theme={theme}
        kind="primary"
        compact={compact}
        grow={compact || pinned}
        icon={plan.mode === "move" ? "MoveRight" : "Copy"}
        loading={m.starting}
        title={m.starting ? "Starting…" : `${verb(plan.mode)} workspace`}
        onPress={m.start}
      />
    </Actions>
  );
  return (
    <Reveal>
      <Frame pinned={pinned} actions={actions}>
        <View style={{ gap: 8 }}>
          <StateTitle theme={theme} title={`Ready to ${plan.mode}`} />
          <Route
            theme={theme}
            from={m.sourceLabel}
            to={m.targetLabel}
            destination={plan.destination}
          />
        </View>
        <ReceiptCard
          theme={theme}
          plan={plan}
          receipt={m.receipt!}
          sourceLabel={m.sourceLabel}
          targetLabel={m.targetLabel}
          dense={pinned}
        />
        {m.startError ? (
          <ProblemNote
            theme={theme}
            problem={{
              place: "general",
              title: "Couldn't start",
              message: m.startError.message,
            }}
          />
        ) : null}
      </Frame>
    </Reveal>
  );
}

function WhereRow({
  theme,
  host,
  icon,
  hue,
  title,
  detail,
}: {
  theme: Theme;
  host: string;
  icon: string;
  hue: string;
  title: string;
  detail?: string;
}) {
  const c = theme.colors;
  const t = text(c);
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
      }}
    >
      <View style={{ paddingTop: 1 }}>
        <Icon name={icon} size={15} color={hue} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text style={t.body}>
          <Text style={{ fontWeight: "600" }}>{host}</Text>
          {"  "}
          {title}
        </Text>
        {detail ? (
          <Text selectable numberOfLines={2} style={[t.meta, mono]}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Where each copy is after a failure: the first thing to know before trying again. */
function WhereThingsAre({ theme, run }: { theme: Theme; run: RunView }) {
  const c = theme.colors;
  const preserved = run.failure?.preservedAt;
  const verified = run.result?.verified ? run.result.cwd : null;
  return (
    <Card theme={theme}>
      <WhereRow
        theme={theme}
        host={run.sourceLabel}
        icon="FolderCheck"
        hue={c.foregroundMuted}
        title={
          run.lost
            ? "Transfer never removes a source on failure."
            : "Workspace still open. Nothing was removed."
        }
      />
      <View style={{ height: 1, backgroundColor: c.border, opacity: 0.7 }} />
      {verified ? (
        <WhereRow
          theme={theme}
          host={run.targetLabel}
          icon="CircleCheck"
          hue={c.statusSuccess}
          title="Verified copy, ready to use."
          detail={verified}
        />
      ) : preserved ? (
        <WhereRow
          theme={theme}
          host={run.targetLabel}
          icon="TriangleAlert"
          hue={c.statusWarning}
          title="Partial copy kept for recovery. Check it before retrying."
          detail={preserved}
        />
      ) : run.lost ? (
        <WhereRow
          theme={theme}
          host={run.targetLabel}
          icon="CircleHelp"
          hue={c.statusWarning}
          title="Unknown. Check it before transferring again."
          detail={run.destination}
        />
      ) : (
        <WhereRow
          theme={theme}
          host={run.targetLabel}
          icon="CircleMinus"
          hue={c.foregroundMuted}
          title="Nothing was kept there."
        />
      )}
    </Card>
  );
}

/** Live stages while it runs, then the outcome with its next step. */
export function RunPanel({
  run,
  theme,
  compact,
  onOpen,
  onNew,
  footnote = true,
  pinned,
}: {
  run: RunView;
  theme: Theme;
  compact: boolean;
  /** Opens the result on its host; absent where this surface can't navigate. */
  onOpen?: () => void;
  onNew(): void;
  footnote?: boolean;
  pinned?: boolean;
}) {
  const c = theme.colors;
  const t = text(c);
  useEffect(() => runs.watch(run.runId), [run.runId]);
  useEffect(() => {
    if (run.state !== "running") runs.markSeen(run.runId);
  }, [run.state, run.runId]);
  const failedStage = run.stages.find((stage) => stage.state === "failed");
  const openable = !!onOpen && !!run.openOn && !!run.result?.verified;
  const rail = (
    <Card theme={theme}>
      <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        <StageRail theme={theme} run={run} />
      </View>
    </Card>
  );
  if (run.state === "running")
    return (
      <Frame pinned={pinned}>
        <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
          <StateTitle
            theme={theme}
            leading={
              <Spinner color={c.foreground} size={16} label="Transferring" />
            }
            title={`${ing(run.mode)} to ${run.targetLabel}`}
            trailing={<Elapsed theme={theme} run={run} />}
          />
          <Route
            theme={theme}
            from={run.sourceLabel}
            to={run.targetLabel}
            destination={run.destination}
          />
        </View>
        {rail}
        {footnote ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ paddingTop: 2 }}>
              <Icon name="Info" size={13} color={c.foregroundMuted} />
            </View>
            <Text style={[t.meta, { flex: 1 }]}>
              {run.transport === "connected"
                ? "You can close this. Keep Paseo open and both hosts connected until it finishes."
                : `You can close this. It keeps running on ${run.sourceLabel}.`}
            </Text>
          </View>
        ) : null}
      </Frame>
    );
  if (run.state === "done")
    return (
      <Reveal>
        <Frame
          pinned={pinned}
          actions={
            <Actions compact={compact}>
              <Button
                theme={theme}
                title="New transfer"
                compact={compact}
                grow={compact}
                onPress={onNew}
              />
              {openable ? (
                <Button
                  theme={theme}
                  kind="primary"
                  compact={compact}
                  grow={compact}
                  icon="SquareArrowOutUpRight"
                  title={`Open on ${run.targetLabel}`}
                  onPress={onOpen!}
                />
              ) : null}
            </Actions>
          }
        >
          <View
            style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            accessibilityLiveRegion="polite"
          >
            <OutcomeMark theme={theme} tone="done" />
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <StateTitle
                theme={theme}
                title={`${past(run.mode)} to ${run.targetLabel}`}
              />
              <Text style={t.meta}>
                Verified in{" "}
                {formatDuration((run.endedAt ?? Date.now()) - run.startedAt)}
                {" · "}
                {plural(run.sessions, "conversation")}
                {run.mode === "move" ? ` · archived on ${run.sourceLabel}` : ""}
              </Text>
            </View>
          </View>
          <Text selectable numberOfLines={2} style={[t.meta, mono]}>
            {run.result?.cwd ?? run.destination}
          </Text>
          {rail}
        </Frame>
      </Reveal>
    );
  const lost = run.lost;
  return (
    <Reveal>
      <Frame
        pinned={pinned}
        actions={
          <Actions compact={compact}>
            {lost && run.transport === "ssh" ? (
              <Button
                theme={theme}
                title="Check again"
                icon="RefreshCw"
                compact={compact}
                grow={compact}
                onPress={() => runs.retry(run.runId)}
              />
            ) : null}
            {openable ? (
              <Button
                theme={theme}
                title={`Open on ${run.targetLabel}`}
                icon="SquareArrowOutUpRight"
                compact={compact}
                grow={compact}
                onPress={onOpen!}
              />
            ) : null}
            <Button
              theme={theme}
              kind="primary"
              compact={compact}
              grow={compact}
              icon="ArrowLeft"
              title="Back to transfer"
              onPress={onNew}
            />
          </Actions>
        }
      >
        <View
          style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
          accessibilityLiveRegion="assertive"
        >
          <OutcomeMark theme={theme} tone={lost ? "lost" : "failed"} />
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <StateTitle
              theme={theme}
              title={lost ? "Status unavailable" : `${verb(run.mode)} stopped`}
            />
            <Text style={t.meta}>
              {lost
                ? `${run.workspaceName} → ${run.targetLabel}`
                : failedStage
                  ? `At “${failedLabel(failedStage.id, run)}” · after ${formatDuration((run.endedAt ?? Date.now()) - run.startedAt)}`
                  : run.workspaceName}
            </Text>
          </View>
        </View>
        <Text selectable style={[t.body, { color: c.foreground }]}>
          {lost ? run.message : (run.failure?.cause ?? run.message)}
        </Text>
        {run.failure?.detail ? (
          <Details theme={theme} text={run.failure.detail} />
        ) : null}
        {run.stages.length ? rail : null}
        <WhereThingsAre theme={theme} run={run} />
      </Frame>
    </Reveal>
  );
}

/** The raw output behind a failure, folded away until asked for. */
function Details({ theme, text: raw }: { theme: Theme; text: string }) {
  const c = theme.colors;
  const t = text(c);
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Button
        theme={theme}
        kind="ghost"
        small
        icon={open ? "ChevronDown" : "ChevronRight"}
        title={open ? "Hide details" : "Show details"}
        onPress={() => setOpen(!open)}
      />
      {open ? (
        <ScrollView
          style={{
            maxHeight: 160,
            borderRadius: 8,
            backgroundColor: c.surface1,
          }}
          contentContainerStyle={{ padding: 10 }}
        >
          <Text selectable style={[t.small, mono, { color: c.foreground }]}>
            {raw.trim()}
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

function failedLabel(id: string, run: RunView) {
  switch (id) {
    case "check":
      return `Check ${run.sourceLabel}`;
    case "copy":
      return run.transport === "ssh" ? "Copy and verify" : "Copy";
    case "verify":
      return `Verify on ${run.targetLabel}`;
    default:
      return `Archive on ${run.sourceLabel}`;
  }
}

/** Transfers started in this app session, newest first, for the screen. */
export function SessionRuns({
  theme,
  list,
  selected,
  onSelect,
}: {
  theme: Theme;
  list: RunView[];
  selected?: string;
  onSelect(run: RunView): void;
}) {
  const c = theme.colors;
  const t = text(c);
  if (!list.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={t.group}>
        This session
      </Text>
      <Card theme={theme}>
        {list.map((run, index) => {
          const hue =
            run.state === "done"
              ? c.statusSuccess
              : run.state === "failed"
                ? run.lost
                  ? c.statusWarning
                  : c.statusDanger
                : c.foreground;
          const status =
            run.state === "running"
              ? `${ing(run.mode)}…`
              : run.state === "done"
                ? `${past(run.mode)} · ${formatDuration((run.endedAt ?? 0) - run.startedAt)}`
                : run.lost
                  ? "Status unavailable"
                  : `${verb(run.mode)} stopped`;
          return (
            <View key={run.runId}>
              {index ? (
                <View
                  style={{ height: 1, backgroundColor: c.border, opacity: 0.6 }}
                />
              ) : null}
              <PressScale
                accessibilityRole="button"
                accessibilityLabel={`${run.workspaceName}, ${run.sourceLabel} to ${run.targetLabel}: ${status}`}
                accessibilityState={{ selected: selected === run.runId }}
                onPress={() => onSelect(run)}
                style={({ hovered }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 44,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor:
                    selected === run.runId
                      ? c.surface2
                      : hovered
                        ? c.surface1
                        : "transparent",
                })}
              >
                {run.state === "running" ? (
                  <Spinner color={c.foreground} size={14} />
                ) : (
                  <Icon
                    name={
                      run.state === "done"
                        ? "CircleCheck"
                        : run.lost
                          ? "TriangleAlert"
                          : "CircleX"
                    }
                    size={15}
                    color={hue}
                  />
                )}
                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                  <Text numberOfLines={1} style={t.body}>
                    {run.workspaceName}
                  </Text>
                  <Text numberOfLines={1} style={t.meta}>
                    {run.sourceLabel} → {run.targetLabel}
                  </Text>
                </View>
                <Text
                  style={[
                    t.meta,
                    {
                      color:
                        run.state === "running"
                          ? c.foreground
                          : c.foregroundMuted,
                    },
                  ]}
                >
                  {status}
                </Text>
              </PressScale>
            </View>
          );
        })}
      </Card>
    </View>
  );
}
