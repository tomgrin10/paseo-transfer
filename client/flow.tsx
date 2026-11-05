import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ScrollView, Text, View } from "react-native";
import { Icon } from "@getpaseo/plugin/client/ui";
import { formatDuration, plainCause, plural } from "../shared/progress";
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
import { mono, withAlpha, type Theme } from "./theme";
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

/** The ground the pinned frame sits on, for its fade: the popover's surface1, or the screen's. */
const FrameGround = createContext<{ ground: string; border: string } | null>(
  null,
);
export const FrameTheme = FrameGround.Provider;

/** A soft fade into the ground: stacked strips, since plugins have no gradient primitive. */
function Fade({ color, edge }: { color: string; edge: "top" | "bottom" }) {
  const steps = [0.12, 0.3, 0.5, 0.7, 0.86, 0.96];
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [edge]: 0,
        flexDirection: edge === "bottom" ? "column" : "column-reverse",
      }}
    >
      {steps.map((alpha) => (
        <View
          key={alpha}
          style={{ height: 4, backgroundColor: withAlpha(color, alpha) }}
        />
      ))}
    </View>
  );
}

/**
 * A state's body with its actions. In the desktop popup (a fixed-height scroll box) the body
 * scrolls on its own and the actions stay pinned below it, so the primary is never cut off; a
 * fade at the cut says there is more. "fill" does the same for a whole phone screen.
 */
export function Frame({
  pinned = false,
  gap = 14,
  children,
  notice,
  actions,
  padding = 0,
}: {
  pinned?: boolean | "fill";
  gap?: number;
  children: ReactNode;
  /** A problem to keep in view: pinned above the actions in the popup. */
  notice?: ReactNode;
  actions?: ReactNode;
  /** Side padding for "fill", where the frame is the screen. */
  padding?: number;
}) {
  const [box, setBox] = useState({ view: 0, content: 0, notice: 0, y: 0 });
  const ground = useContext(FrameGround);
  const scroller = useRef<ScrollView>(null);
  // When a problem appears, scroll the body to its end so the control it is about (the folder,
  // Copy or Move) sits right above the pinned note.
  const hasNotice = !!notice;
  useEffect(() => {
    if (hasNotice && pinned) {
      const timer = setTimeout(
        () => scroller.current?.scrollToEnd({ animated: true }),
        60,
      );
      return () => clearTimeout(timer);
    }
  }, [hasNotice, pinned]);
  if (!pinned)
    return (
      <View style={{ gap }}>
        {children}
        {notice}
        {actions}
      </View>
    );
  const fill = pinned === "fill";
  // The body gets what the popup's fixed box leaves after the pinned notice and actions.
  const room = (actions ? 356 : 408) - (notice ? box.notice + 12 : 0);
  const more = box.content > box.view + 1 && box.y + box.view < box.content - 2;
  const pinnedArea =
    notice || actions ? (
      <View
        style={
          fill
            ? {
                gap: 12,
                paddingHorizontal: padding,
                paddingTop: 12,
                paddingBottom: 16,
                borderTopWidth: more && ground ? 1 : 0,
                borderTopColor: ground?.border,
              }
            : { gap: 12 }
        }
      >
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
    ) : null;
  return (
    <View style={fill ? { flex: 1 } : { gap: 12 }}>
      <View style={fill ? { flex: 1 } : null}>
        <ScrollView
          ref={scroller}
          style={
            fill ? { flex: 1 } : { maxHeight: Math.max(160, room), flexGrow: 0 }
          }
          contentContainerStyle={[
            { gap },
            fill ? { padding, paddingBottom: 20 } : null,
          ]}
          scrollEventThrottle={32}
          onScroll={(event) => {
            const y = event.nativeEvent.contentOffset.y;
            setBox((value) =>
              Math.abs(value.y - y) < 2 ? value : { ...value, y },
            );
          }}
          onLayout={(event) => {
            const view = event.nativeEvent.layout.height;
            setBox((value) =>
              value.view === view ? value : { ...value, view },
            );
          }}
          onContentSizeChange={(_, content) =>
            setBox((value) =>
              value.content === content ? value : { ...value, content },
            )
          }
        >
          {children}
        </ScrollView>
        {more && ground && !fill ? (
          <Fade color={ground.ground} edge="bottom" />
        ) : null}
        {box.y > 2 && ground && !fill ? (
          <Fade color={ground.ground} edge="top" />
        ) : null}
      </View>
      {pinnedArea}
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
          // A refused Move offers its fix as the primary below, not a second button here.
          <ProblemNote
            theme={theme}
            problem={generalProblem}
            compact={compact}
            onAction={m.blockedMove ? undefined : () => m.setMode("copy")}
          />
        ) : null
      }
      actions={
        m.blockedMove ? (
          <Button
            theme={theme}
            kind="primary"
            grow
            compact={compact}
            icon="Copy"
            title="Use Copy instead"
            onPress={() => m.setMode("copy")}
          />
        ) : (
          <PreviewButton m={m} theme={theme} compact={compact} />
        )
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

export function PreviewButton({
  m,
  theme,
  compact,
  grow = true,
}: {
  m: TransferModel;
  theme: Theme;
  compact: boolean;
  grow?: boolean;
}) {
  return (
    <Button
      theme={theme}
      kind="primary"
      grow={grow}
      compact={compact}
      icon={m.previewing ? undefined : "ScanSearch"}
      loading={m.previewing}
      title={m.previewing ? "Checking both hosts…" : "Preview transfer"}
      onPress={m.preview}
      disabled={!m.canPreview}
    />
  );
}

/** What the preview found, then the one action that starts it. */
export function ReceiptView({
  m,
  theme,
  compact,
  back = true,
  pinned,
  padding,
  after,
}: {
  m: TransferModel;
  theme: Theme;
  compact: boolean;
  back?: boolean;
  pinned?: boolean | "fill";
  padding?: number;
  /** More body content below, such as this session's transfers on the phone screen. */
  after?: ReactNode;
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
        grow={compact || !!pinned}
        icon={plan.mode === "move" ? "MoveRight" : "Copy"}
        loading={m.starting}
        title={m.starting ? "Starting…" : `${verb(plan.mode)} workspace`}
        onPress={m.start}
      />
    </Actions>
  );
  return (
    <Reveal>
      <Frame pinned={pinned} padding={padding} actions={actions}>
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
          dense={pinned === true}
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
        {after}
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
  padding,
  after,
}: {
  run: RunView;
  theme: Theme;
  compact: boolean;
  /** Opens the result on its host; absent where this surface can't navigate. */
  onOpen?: () => void;
  onNew(): void;
  footnote?: boolean;
  pinned?: boolean | "fill";
  padding?: number;
  after?: ReactNode;
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
      <Frame pinned={pinned} padding={padding}>
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
        {after}
      </Frame>
    );
  if (run.state === "done")
    return (
      <Reveal>
        <Frame
          pinned={pinned}
          padding={padding}
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
                {plural(run.files, "file")}
                {" · "}
                {plural(run.sessions, "conversation")}
                {run.mode === "move" ? ` · archived on ${run.sourceLabel}` : ""}
              </Text>
            </View>
          </View>
          <Route
            theme={theme}
            from={run.sourceLabel}
            to={run.targetLabel}
            destination={run.result?.cwd ?? run.destination}
            done
          />
          {rail}
          {after}
        </Frame>
      </Reveal>
    );
  const lost = run.lost;
  const cause = run.failure?.cause ?? run.message;
  const plain = plainCause(cause, {
    source: run.sourceLabel,
    target: run.targetLabel,
  });
  // The provider's own words and the command output fold under Show details.
  const raw = lost
    ? null
    : [plain !== cause ? cause : null, run.failure?.detail]
        .filter(Boolean)
        .join("\n\n") || null;
  return (
    <Reveal>
      <Frame
        pinned={pinned}
        padding={padding}
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
          {lost ? run.message : plain}
        </Text>
        <WhereThingsAre theme={theme} run={run} />
        {raw ? <Details theme={theme} text={raw} /> : null}
        {run.stages.length ? rail : null}
        {after}
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
