import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import { Icon } from "@getpaseo/plugin/client/ui";
import {
  copiedLine,
  formatBytes,
  formatDuration,
  plural,
  type Problem,
  type Stage,
} from "../shared/progress";
import type { Plan } from "../shared/types";
import { Button, Card, Chip, useNow, text } from "./kit";
import { PressScale, Spinner, useReducedMotion, IconSwap } from "./motion";
import { isLight, mono, raised, tabular, tint, withAlpha } from "./theme";
import type { Theme } from "./theme";
import type { RunView } from "./runs";
import type { Receipt, TransferModel } from "./use-transfer";

const PROVIDER = { claude: "Claude", codex: "Codex" } as const;

/** A small muted group label with its content below. */
export function Field({
  theme,
  label,
  trailing,
  children,
  gap = 8,
}: {
  theme: Theme;
  label: string;
  trailing?: ReactNode;
  children: ReactNode;
  gap?: number;
}) {
  const t = text(theme.colors);
  return (
    <View style={{ gap }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          minHeight: 18,
        }}
      >
        <Text accessibilityRole="header" style={t.group}>
          {label}
        </Text>
        {trailing}
      </View>
      {children}
    </View>
  );
}

/** Two or three exclusive choices in one track. The selected one lifts; accent stays on actions. */
export function Segmented<V extends string>({
  theme,
  value,
  options,
  onChange,
  disabled,
  compact,
  label,
}: {
  theme: Theme;
  value: V;
  options: { value: V; label: string; icon?: string }[];
  onChange(value: V): void;
  disabled?: boolean;
  compact?: boolean;
  label: string;
}) {
  const c = theme.colors;
  const light = isLight(c);
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        padding: 3,
        gap: 3,
        borderRadius: 9,
        backgroundColor: light ? c.surface2 : c.surface1,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <PressScale
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: on, checked: on, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            outerStyle={{ flex: 1 }}
            style={({ hovered }) => ({
              minHeight: compact ? 38 : 28,
              borderRadius: 7,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingHorizontal: 10,
              backgroundColor: on
                ? light
                  ? c.surface0
                  : c.surface2
                : hovered && !disabled
                  ? withAlpha(c.foreground, 0.05)
                  : "transparent",
              ...(on ? raised(c) : null),
            })}
          >
            {option.icon ? (
              <Icon
                name={option.icon}
                size={14}
                color={on ? c.foreground : c.foregroundMuted}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={{
                color: on ? c.foreground : c.foregroundMuted,
                fontSize: compact ? 14 : 13,
                lineHeight: 18,
                fontWeight: on ? "600" : "500",
              }}
            >
              {option.label}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );
}

// When each host was first seen not connected, so a host that never comes back turns amber.
const unreachableSince = new Map<string, number>();
const GRACE_MS = 8000;

function hostStatus(
  item: TransferModel["connectedHosts"][number],
  now: number,
) {
  if (item.status === "online") unreachableSince.delete(item.serverId);
  else if (!unreachableSince.has(item.serverId))
    unreachableSince.set(item.serverId, now);
  if (item.ready) return { text: "Connected", warn: false };
  const waiting = now - (unreachableSince.get(item.serverId) ?? now);
  if (
    (item.status === "connecting" || item.status === "idle") &&
    waiting < GRACE_MS
  )
    return { text: "Connecting…", warn: false };
  if (item.status !== "online")
    return {
      text: "Not reachable · check that Paseo is running there",
      warn: true,
    };
  return { text: "Needs paseo-transfer installed there", warn: true };
}

/** Connected hosts as choice tiles, each with its own status. A sole ready host is preselected. */
export function HostPicker({
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
  // Re-read host status every couple of seconds so "Connecting…" can give way to guidance.
  const now = useNow(2000);
  if (!m.connectedHosts.length)
    return (
      <View
        style={{
          gap: 4,
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: c.border,
        }}
      >
        <Text style={t.label}>No other hosts yet</Text>
        <Text style={t.meta}>
          Add your other machine in Paseo, then install paseo-transfer there. It
          shows up here on its own.
        </Text>
      </View>
    );
  return (
    <View accessibilityRole="radiogroup" style={{ gap: 6 }}>
      {m.connectedHosts.map((item) => {
        const on = m.remoteId === item.serverId;
        const status = hostStatus(item, now);
        const disabled = m.locked || !item.ready;
        return (
          <PressScale
            key={item.serverId}
            accessibilityRole="radio"
            accessibilityLabel={`${item.label}: ${status.text}`}
            accessibilityState={{ selected: on, checked: on, disabled }}
            disabled={disabled}
            onPress={() => m.setRemoteId(item.serverId)}
            style={({ hovered }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: compact ? 56 : 48,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: on ? c.foreground : c.border,
              backgroundColor: on
                ? c.surface2
                : hovered && !disabled
                  ? c.surface1
                  : "transparent",
            })}
          >
            <Icon
              name="Server"
              size={16}
              color={item.ready ? c.foreground : c.foregroundMuted}
            />
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <Text
                numberOfLines={1}
                style={[
                  t.label,
                  { color: item.ready ? c.foreground : c.foregroundMuted },
                ]}
              >
                {item.label}
              </Text>
              <Text
                numberOfLines={2}
                style={[
                  t.meta,
                  status.warn ? { color: c.statusWarning } : null,
                ]}
              >
                {status.text}
              </Text>
            </View>
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: on ? c.foreground : c.border,
                alignItems: "center",
                justifyContent: "center",
                opacity: item.ready ? 1 : 0.5,
              }}
            >
              {on ? (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.foreground,
                  }}
                />
              ) : null}
            </View>
          </PressScale>
        );
      })}
    </View>
  );
}

/** A text field in the family's control shape. Paths use monospace. */
export function Input({
  theme,
  value,
  onChange,
  placeholder,
  label,
  compact,
  disabled,
  path,
  invalid,
}: {
  theme: Theme;
  value: string;
  onChange(value: string): void;
  placeholder: string;
  label: string;
  compact: boolean;
  disabled?: boolean;
  path?: boolean;
  invalid?: boolean;
}) {
  const c = theme.colors;
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={withAlpha(c.foregroundMuted, 0.8)}
      editable={!disabled}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        {
          color: c.foreground,
          backgroundColor: isLight(c) ? c.surface0 : c.surface1,
          borderColor: invalid
            ? c.statusWarning
            : focused
              ? c.foreground
              : c.border,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 11,
          minHeight: compact ? 44 : 34,
          fontSize: compact ? 16 : 13,
          opacity: disabled ? 0.6 : 1,
        },
        path ? mono : null,
        Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null,
      ]}
    />
  );
}

export function SshFields({
  m,
  theme,
  compact,
  showOptions,
}: {
  m: TransferModel;
  theme: Theme;
  compact: boolean;
  showOptions: boolean;
}) {
  const c = theme.colors;
  const t = text(c);
  const [advanced, setAdvanced] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Input
        theme={theme}
        value={m.remote}
        onChange={m.setRemote}
        placeholder="SSH alias or user@host"
        label="SSH host"
        compact={compact}
        disabled={m.locked}
      />
      {m.suggestions.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {m.suggestions.map((item) => {
            const on = m.remote === item.target;
            return (
              <PressScale
                key={item.target}
                accessibilityRole="button"
                accessibilityLabel={`Use ${item.label}`}
                accessibilityState={{ selected: on, disabled: m.locked }}
                disabled={m.locked}
                onPress={() => m.setRemote(item.target)}
                style={({ hovered }) => ({
                  minHeight: compact ? 36 : 26,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  borderColor: on ? c.foreground : c.border,
                  backgroundColor: on
                    ? c.surface2
                    : hovered
                      ? c.surface1
                      : "transparent",
                })}
              >
                <Icon
                  name={item.source === "tailscale" ? "Network" : "Terminal"}
                  size={12}
                  color={c.foregroundMuted}
                />
                <Text style={[t.meta, { color: c.foreground }]}>
                  {item.label}
                </Text>
              </PressScale>
            );
          })}
        </View>
      ) : null}
      <Text style={t.meta}>
        Uses your SSH config, keys and host-key checks. The other host needs
        Paseo, not this plugin.
      </Text>
      {showOptions || advanced ? (
        <View
          style={{
            flexDirection: compact || !showOptions ? "column" : "row",
            gap: 10,
          }}
        >
          <View style={{ flex: compact || !showOptions ? undefined : 1 }}>
            <Field theme={theme} label="Paseo home (optional)" gap={6}>
              <Input
                theme={theme}
                value={m.home}
                onChange={m.setHome}
                placeholder="Default on the other host"
                label="Remote Paseo home"
                compact={compact}
                disabled={m.locked}
                path
              />
            </Field>
          </View>
          <View style={{ flex: compact || !showOptions ? undefined : 1 }}>
            <Field theme={theme} label="SSH key (optional)" gap={6}>
              <Input
                theme={theme}
                value={m.identityFile}
                onChange={m.setIdentityFile}
                placeholder="From SSH config"
                label="SSH identity file"
                compact={compact}
                disabled={m.locked}
                path
              />
            </Field>
          </View>
        </View>
      ) : (
        <Button
          theme={theme}
          kind="ghost"
          small={!compact}
          compact={compact}
          icon="SlidersHorizontal"
          title="Connection options"
          onPress={() => setAdvanced(true)}
          disabled={m.locked}
        />
      )}
    </View>
  );
}

/** "To" / "From": connected host tiles, or the SSH fields, with the switch between them. */
export function HostSection({
  m,
  theme,
  compact,
  label,
  showOptions = false,
}: {
  m: TransferModel;
  theme: Theme;
  compact: boolean;
  label: string;
  showOptions?: boolean;
}) {
  const ssh = m.transport === "ssh";
  return (
    <Field
      theme={theme}
      label={label}
      trailing={
        <Button
          theme={theme}
          kind="ghost"
          small
          icon={ssh ? "Server" : "Terminal"}
          title={ssh ? "Paseo hosts" : "Use SSH"}
          accessibilityLabel={
            ssh ? "Choose a connected Paseo host" : "Use SSH instead"
          }
          onPress={() => m.setTransport(ssh ? "connected" : "ssh")}
          disabled={m.locked}
        />
      }
    >
      {ssh ? (
        <SshFields
          m={m}
          theme={theme}
          compact={compact}
          showOptions={showOptions}
        />
      ) : (
        <HostPicker m={m} theme={theme} compact={compact} />
      )}
    </Field>
  );
}

export function FolderField({
  m,
  theme,
  compact,
  inline = true,
}: {
  m: TransferModel;
  theme: Theme;
  compact: boolean;
  /** Show its problem under the field; the popup pins problems above its button instead. */
  inline?: boolean;
}) {
  const t = text(theme.colors);
  const flagged = m.problem?.place === "destination";
  const problem = flagged && inline ? m.problem : null;
  return (
    <Field theme={theme} label={`New folder on ${m.targetLabel}`}>
      <Input
        theme={theme}
        value={m.destination}
        onChange={m.setDestination}
        placeholder="~/Projects/my-workspace"
        label="Destination folder"
        compact={compact}
        disabled={m.locked}
        path
        invalid={flagged}
      />
      {problem ? (
        <ProblemNote theme={theme} problem={problem} />
      ) : (
        <Text style={t.meta}>
          Must not exist yet. Transfer never writes into an existing folder.
        </Text>
      )}
    </Field>
  );
}

export function ModeField({
  m,
  theme,
  compact,
  inline = true,
}: {
  m: TransferModel;
  theme: Theme;
  compact: boolean;
  inline?: boolean;
}) {
  const t = text(theme.colors);
  const problem = m.problem?.place === "mode" && inline ? m.problem : null;
  return (
    <Field theme={theme} label="Copy or move">
      <Segmented<"copy" | "move">
        theme={theme}
        label="Copy or move"
        value={m.mode}
        onChange={(mode) => m.setMode(mode)}
        disabled={m.locked}
        compact={compact}
        options={[
          { value: "copy", label: "Copy", icon: "Copy" },
          { value: "move", label: "Move", icon: "MoveRight" },
        ]}
      />
      {problem ? (
        <ProblemNote
          theme={theme}
          problem={problem}
          onAction={() => m.setMode("copy")}
          compact={compact}
        />
      ) : (
        <Text style={t.meta}>
          {m.mode === "move"
            ? `Archives it on ${m.sourceLabel} once ${m.targetLabel} verifies the copy.`
            : `Keeps the workspace open on ${m.sourceLabel}.`}
        </Text>
      )}
    </Field>
  );
}

/** A preview problem: amber when the person can fix it here, red when it failed outright. */
export function ProblemNote({
  theme,
  problem,
  onAction,
  compact = false,
}: {
  theme: Theme;
  problem: Problem;
  onAction?: () => void;
  compact?: boolean;
}) {
  const c = theme.colors;
  const t = text(c);
  const hue = problem.place === "general" ? c.statusDanger : c.statusWarning;
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        gap: 9,
        padding: 10,
        borderRadius: 8,
        backgroundColor: tint(hue, c),
      }}
    >
      <View style={{ paddingTop: 1 }}>
        <Icon
          name={problem.place === "general" ? "CircleX" : "TriangleAlert"}
          size={15}
          color={hue}
        />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[t.label, { color: hue }]}>{problem.title}</Text>
        <Text selectable style={[t.meta, { color: c.foreground }]}>
          {problem.message}
        </Text>
        {problem.action === "use-copy" && onAction ? (
          <View style={{ paddingTop: 5 }}>
            <Button
              theme={theme}
              title="Use Copy instead"
              icon="Copy"
              small={!compact}
              compact={compact}
              onPress={onAction}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Laptop → Build server, with the folder it lands in. */
export function Route({
  theme,
  from,
  to,
  destination,
  done,
}: {
  theme: Theme;
  from: string;
  to: string;
  destination?: string;
  done?: boolean;
}) {
  const c = theme.colors;
  const t = text(c);
  const end = (label: string, landed = false) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 9,
        height: 26,
        borderRadius: 999,
        backgroundColor: landed ? tint(c.statusSuccess, c) : c.surface2,
        flexShrink: 1,
      }}
    >
      <Icon
        name={landed ? "CircleCheck" : "Server"}
        size={13}
        color={landed ? c.statusSuccess : c.foregroundMuted}
      />
      <Text
        numberOfLines={1}
        style={[
          t.meta,
          { color: c.foreground, fontWeight: "600", flexShrink: 1 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
  return (
    <View style={{ gap: 6 }}>
      <View
        accessibilityLabel={`From ${from} to ${to}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      >
        {end(from)}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexGrow: 1,
            flexShrink: 1,
            minWidth: 24,
            maxWidth: 72,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          <Icon name="ChevronRight" size={13} color={c.foregroundMuted} />
        </View>
        {end(to, done)}
      </View>
      {destination ? (
        <Text selectable numberOfLines={2} style={[t.meta, mono]}>
          {destination}
        </Text>
      ) : null}
    </View>
  );
}

export function ReceiptRow({
  theme,
  icon,
  title,
  detail,
  muted,
  dense,
}: {
  theme: Theme;
  icon: string;
  title: string;
  detail?: ReactNode;
  muted?: boolean;
  dense?: boolean;
}) {
  const c = theme.colors;
  const t = text(c);
  return (
    <View
      style={{ flexDirection: "row", gap: 10, paddingVertical: dense ? 4 : 7 }}
    >
      <View style={{ width: 16, paddingTop: 1, alignItems: "center" }}>
        <Icon
          name={icon}
          size={15}
          color={muted ? c.foregroundMuted : c.foreground}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text
          style={[t.body, { color: muted ? c.foregroundMuted : c.foreground }]}
        >
          {title}
        </Text>
        {detail ? (
          typeof detail === "string" ? (
            <Text style={t.meta}>{detail}</Text>
          ) : (
            detail
          )
        ) : null}
      </View>
    </View>
  );
}

/** Exactly what travels and what stays behind, from the preview's own counts. */
export function ReceiptCard({
  theme,
  plan,
  receipt,
  sourceLabel,
  targetLabel,
  dense = false,
}: {
  theme: Theme;
  plan: Plan;
  receipt: Receipt;
  sourceLabel: string;
  targetLabel: string;
  /** The popup: fewer words per row, the stay-behind list on single lines. */
  dense?: boolean;
}) {
  const c = theme.colors;
  const t = text(c);
  const conversations = receipt.conversations ?? [];
  const shown = conversations.slice(0, dense ? 2 : 3);
  const providers = [
    ...new Set(conversations.map((s) => PROVIDER[s.provider])),
  ].sort();
  const pad = {
    paddingHorizontal: 12,
    paddingTop: dense ? 8 : 10,
    paddingBottom: dense ? 6 : 4,
  };
  return (
    <Card theme={theme}>
      <View style={pad}>
        <Text accessibilityRole="header" style={t.group}>
          Goes to {targetLabel}
        </Text>
        {plan.branch ? (
          <ReceiptRow
            theme={theme}
            dense={dense}
            icon="GitBranch"
            title={plan.branch}
            detail={
              dense
                ? "Every branch and tag"
                : "Git history: every local branch and tag"
            }
          />
        ) : null}
        <ReceiptRow
          theme={theme}
          dense={dense}
          icon="Files"
          title={`${plural(plan.files, "file")} · ${formatBytes(plan.bytes)}`}
          detail={
            dense
              ? "Uncommitted changes included"
              : "With uncommitted changes, staged and unstaged"
          }
        />
        <ReceiptRow
          theme={theme}
          dense={dense}
          icon="MessagesSquare"
          title={
            plan.sessions
              ? `${plural(plan.sessions, "conversation")}${providers.length ? ` · ${providers.join(" and ")}` : ""}`
              : "No conversations"
          }
          detail={
            shown.length ? (
              <View style={{ gap: 1 }}>
                {shown.map((session, index) => (
                  <Text key={index} numberOfLines={1} style={t.meta}>
                    {session.title || "Untitled conversation"}
                  </Text>
                ))}
                {conversations.length > shown.length ? (
                  <Text style={t.meta}>
                    and {conversations.length - shown.length} more
                  </Text>
                ) : null}
              </View>
            ) : plan.sessions ? (
              "Imported there as Paseo agents"
            ) : undefined
          }
        />
      </View>
      <View style={{ height: 1, backgroundColor: c.border, opacity: 0.7 }} />
      <View style={pad}>
        <Text accessibilityRole="header" style={t.group}>
          Stays on {sourceLabel}
        </Text>
        {receipt.hasIgnored !== false ? (
          <ReceiptRow
            theme={theme}
            dense={dense}
            muted
            icon="EyeOff"
            title={
              receipt.hasIgnored
                ? dense
                  ? "Git-ignored files, like .env"
                  : "Git-ignored files"
                : "Git-ignored files, if any"
            }
            detail={
              dense
                ? undefined
                : "Such as .env and dependencies. Recreate them there."
            }
          />
        ) : null}
        <ReceiptRow
          theme={theme}
          dense={dense}
          muted
          icon="KeyRound"
          title="Sign-ins, MCP and launch settings"
          detail={dense ? undefined : `${targetLabel} uses its own`}
        />
        <ReceiptRow
          theme={theme}
          dense={dense}
          muted
          icon={plan.mode === "move" ? "Archive" : "FolderCheck"}
          title={
            plan.mode === "move"
              ? dense
                ? "This workspace, archived once verified"
                : "This workspace, archived"
              : dense
                ? "This workspace, still open"
                : "This workspace"
          }
          detail={
            dense
              ? undefined
              : plan.mode === "move"
                ? `Only after ${targetLabel} verifies the copy`
                : "Stays open"
          }
        />
      </View>
    </Card>
  );
}

function stageLabel(
  stage: Stage,
  run: Pick<RunView, "transport" | "sourceLabel" | "targetLabel" | "bytes">,
) {
  switch (stage.id) {
    case "check":
      return `Check ${run.sourceLabel}`;
    case "copy":
      return run.transport === "ssh"
        ? `Copy and verify on ${run.targetLabel}`
        : `Copy ${formatBytes(run.bytes)}`;
    case "verify":
      return `Verify on ${run.targetLabel}`;
    case "archive":
      return `Archive on ${run.sourceLabel}`;
  }
}

function stageDetail(stage: Stage, run: RunView): string | null {
  const what = `Files, Git and ${plural(run.sessions, "conversation")}`;
  switch (stage.id) {
    case "check":
      return stage.state === "done" ? "Unchanged since the preview" : null;
    case "copy":
      if (run.transport === "ssh")
        return stage.state === "done" ? `${what} match` : null;
      return stage.state === "running"
        ? copiedLine(run.copied * run.bytes, run.bytes)
        : null;
    case "verify":
      return stage.state === "done"
        ? `${what} match`
        : stage.state === "running"
          ? `${what}, then import`
          : null;
    case "archive":
      return stage.state === "done"
        ? "Workspace archived"
        : stage.state === "pending"
          ? "Only after the copy is verified"
          : null;
  }
}

function StageNode({ theme, state }: { theme: Theme; state: Stage["state"] }) {
  const c = theme.colors;
  return (
    <View
      style={{
        width: 16,
        height: 16,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <IconSwap swapKey={state} size={16}>
        {state === "done" ? (
          <Icon name="CircleCheck" size={16} color={c.statusSuccess} />
        ) : state === "failed" ? (
          <Icon name="CircleX" size={16} color={c.statusDanger} />
        ) : state === "running" ? (
          <Spinner color={c.foreground} size={14} label="In progress" />
        ) : (
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: c.border,
            }}
          />
        )}
      </IconSwap>
    </View>
  );
}

/** The copy stage's thin bar: neutral track, ink fill for the bytes actually sent. */
function CopyBar({ theme, value }: { theme: Theme; value: number }) {
  const c = theme.colors;
  const reduced = useReducedMotion();
  const width = useRef(new Animated.Value(value)).current;
  useEffect(() => {
    if (reduced) {
      width.setValue(value);
      return;
    }
    const animation = Animated.timing(width, {
      toValue: value,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [value, reduced]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{
        height: 3,
        borderRadius: 2,
        backgroundColor: withAlpha(c.foreground, 0.12),
        overflow: "hidden",
        marginTop: 5,
      }}
    >
      <Animated.View
        style={{
          height: 3,
          borderRadius: 2,
          backgroundColor: withAlpha(c.foreground, 0.7),
          width: width.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", "100%"],
          }),
        }}
      />
    </View>
  );
}

/** Each leg of the transfer with its own time; the live one counts up. */
export function StageRail({ theme, run }: { theme: Theme; run: RunView }) {
  const c = theme.colors;
  const t = text(c);
  const now = useNow(run.state === "running" ? 1000 : 60_000);
  return (
    <View style={{ paddingVertical: 4 }}>
      <View accessibilityRole="list">
        {run.stages.map((stage, index) => {
          const last = index === run.stages.length - 1;
          const detail = stageDetail(stage, run);
          const duration =
            stage.startedAt && stage.endedAt
              ? formatDuration(stage.endedAt - stage.startedAt)
              : stage.startedAt && stage.state === "running"
                ? formatDuration(now - stage.startedAt)
                : stage.startedAt && stage.state === "failed" && run.endedAt
                  ? formatDuration(run.endedAt - stage.startedAt)
                  : "";
          const tone =
            stage.state === "failed"
              ? c.statusDanger
              : stage.state === "pending"
                ? c.foregroundMuted
                : c.foreground;
          return (
            <View
              key={stage.id}
              accessibilityLabel={`${stageLabel(stage, run)}: ${stage.state}${duration ? `, ${duration}` : ""}`}
              style={{ flexDirection: "row", gap: 10 }}
            >
              <View style={{ width: 16, alignItems: "center" }}>
                <View style={{ paddingTop: 2 }}>
                  <StageNode theme={theme} state={stage.state} />
                </View>
                {last ? null : (
                  <View
                    style={{
                      width: 1.5,
                      flex: 1,
                      minHeight: 8,
                      marginVertical: 3,
                      borderRadius: 1,
                      backgroundColor:
                        stage.state === "done"
                          ? withAlpha(c.statusSuccess, 0.45)
                          : c.border,
                    }}
                  />
                )}
              </View>
              <View
                style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 12 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      t.body,
                      {
                        flex: 1,
                        color: tone,
                        fontWeight: stage.state === "running" ? "600" : "400",
                      },
                    ]}
                  >
                    {stageLabel(stage, run)}
                  </Text>
                  <Text
                    style={[
                      t.meta,
                      {
                        color:
                          stage.state === "running"
                            ? c.foreground
                            : c.foregroundMuted,
                      },
                    ]}
                  >
                    {duration}
                  </Text>
                </View>
                {detail ? <Text style={t.meta}>{detail}</Text> : null}
                {stage.id === "copy" &&
                stage.state === "running" &&
                run.transport === "connected" ? (
                  <CopyBar theme={theme} value={run.copied} />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      {run.state === "done" && run.endedAt ? (
        // The legs add up to the whole: one total under their times.
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: 8,
            marginTop: 10,
            paddingTop: 9,
            borderTopWidth: 1,
            borderTopColor: withAlpha(c.border, 0.8),
          }}
        >
          <Text style={[t.body, { flex: 1, paddingLeft: 26 }]}>
            Verified end to end
          </Text>
          <Text style={[t.meta, { color: c.foreground, fontWeight: "600" }]}>
            {formatDuration(run.endedAt - run.startedAt)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** The outcome badge: a check that grows in once, a cross, or a warning. */
export function OutcomeMark({
  theme,
  tone,
}: {
  theme: Theme;
  tone: "done" | "failed" | "lost";
}) {
  const c = theme.colors;
  const reduced = useReducedMotion();
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [reduced]);
  const hue =
    tone === "done"
      ? c.statusSuccess
      : tone === "failed"
        ? c.statusDanger
        : c.statusWarning;
  return (
    <Animated.View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tint(hue, c),
        opacity: enter,
        transform: [
          {
            scale: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1],
            }),
          },
        ],
      }}
    >
      <Icon
        name={
          tone === "done" ? "Check" : tone === "failed" ? "X" : "TriangleAlert"
        }
        size={19}
        color={hue}
      />
    </Animated.View>
  );
}

/** The elapsed or total time of a run, in tabular figures. */
export function Elapsed({ theme, run }: { theme: Theme; run: RunView }) {
  const now = useNow(1000);
  const end = run.endedAt ?? now;
  return (
    <Text style={[text(theme.colors).meta, tabular]}>
      {formatDuration(end - run.startedAt)}
    </Text>
  );
}

export { Chip };
