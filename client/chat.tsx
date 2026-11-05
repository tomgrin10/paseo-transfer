import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type {
  PluginClientContext,
  PluginTimelineItemProps,
} from "@getpaseo/plugin/client";
import { Icon, ScrollView } from "@getpaseo/plugin/client/ui";
import {
  TOOL_ROW_KIND,
  ToolRowSchema,
  homePath,
  rowLine,
  toolRow,
  type ToolRow,
} from "../shared/chat";
import { mono, tabular, type Theme } from "./theme";

function Detail({ row, theme }: { row: ToolRow; theme: Theme }) {
  const c = theme.colors;
  const body = {
    color: c.foreground,
    fontSize: 13,
    lineHeight: 19,
    ...tabular,
  };
  const meta = {
    color: c.foregroundMuted,
    fontSize: 12,
    lineHeight: 17,
    ...tabular,
  };
  if (row.state === "failed")
    return (
      <Text selectable style={[body, { color: c.statusDanger }]}>
        {row.error || "The tool reported an error."}
      </Text>
    );
  if (row.tool === "hosts")
    return (
      <View style={{ gap: 6 }}>
        {row.hosts.map((host, index) => (
          <View
            key={index}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Icon
              name={host.source === "tailscale" ? "Network" : "Terminal"}
              size={13}
              color={c.foregroundMuted}
            />
            <Text numberOfLines={1} style={[body, { flexShrink: 1 }]}>
              {host.label}
            </Text>
            <Text numberOfLines={1} style={[meta, mono, { flexShrink: 1 }]}>
              {host.target !== host.label ? host.target : ""}
            </Text>
            <Text style={meta}>
              {host.source === "tailscale" ? "Tailscale" : "SSH config"}
            </Text>
          </View>
        ))}
        <Text style={meta}>
          Listing doesn't connect or copy. Transfers start from the Transfer
          screen after a preview.
        </Text>
      </View>
    );
  const run = row.run!;
  return (
    <View style={{ gap: 6 }}>
      <Text
        selectable
        style={[
          body,
          run.state === "failed" ? { color: c.statusDanger } : null,
        ]}
      >
        {run.message}
        {run.host ? <Text style={meta}>{`  on ${run.host}`}</Text> : null}
      </Text>
      {run.cwd ? (
        <Text selectable style={[meta, mono]}>
          {homePath(run.cwd)}
        </Text>
      ) : null}
      {row.runId ? <Text style={meta}>Run {row.runId.slice(0, 8)}</Text> : null}
    </View>
  );
}

/**
 * Transfer's agent tools as one quiet line, sized like Paseo's tool rows, instead of a raw
 * `mcp__paseo__transfer_run_status` call. Press to see what it found.
 */
function ToolRowView({ item, theme }: PluginTimelineItemProps<ToolRow>) {
  const c = theme.colors;
  const row = item.data;
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const openable =
    row.state === "failed"
      ? row.error !== ""
      : row.tool === "hosts"
        ? row.hosts.length > 0
        : row.run !== null;
  const open = expanded && openable;
  const active = openable && (hovered || expanded);
  const failed = row.state === "failed" || row.run?.state === "failed";
  const tone = failed ? c.statusDanger : c.foregroundMuted;
  return (
    <View style={{ marginHorizontal: -13 }}>
      <Pressable
        disabled={!openable}
        onPress={() => setExpanded((value) => !value)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        accessibilityRole={openable ? "button" : undefined}
        aria-expanded={openable ? expanded : undefined}
        aria-busy={row.state === "running"}
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: open ? c.border : "transparent",
          borderBottomLeftRadius: open ? 0 : 8,
          borderBottomRightRadius: open ? 0 : 8,
          backgroundColor: open ? c.surface1 : "transparent",
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            marginRight: 4,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {active ? (
            <View
              style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
            >
              <Icon name="ChevronRight" size={14} color={c.foreground} />
            </View>
          ) : (
            <Icon
              name={
                failed
                  ? "TriangleAlert"
                  : row.tool === "hosts"
                    ? "Server"
                    : "ArrowRightLeft"
              }
              size={12}
              color={tone}
            />
          )}
        </View>
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            fontSize: 14,
            ...tabular,
            color: failed
              ? c.statusDanger
              : active || row.state === "running"
                ? c.foreground
                : c.foregroundMuted,
            opacity: row.state === "running" ? 0.72 : 1,
          }}
        >
          {rowLine(row)}
        </Text>
      </Pressable>
      {open ? (
        <View
          style={{
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: c.border,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            overflow: "hidden",
          }}
        >
          <ScrollView
            style={[
              { maxHeight: 320 },
              Platform.OS === "web"
                ? ({ overscrollBehavior: "contain" } as object)
                : null,
            ]}
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Detail row={row} theme={theme} />
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function contributeChat(client: PluginClientContext) {
  const removers = [
    client.addTimelineTransformer({
      id: "transfer-tool-calls",
      query: { itemType: "tool_call" },
      transform({ item }) {
        const row = toolRow(item.name, item.status, item.detail, item.error);
        return row === null
          ? undefined
          : {
              items: [
                {
                  type: "plugin" as const,
                  kind: TOOL_ROW_KIND,
                  version: 1,
                  data: row,
                },
              ],
            };
      },
    }),
    client.addTimelineRenderer({
      kind: TOOL_ROW_KIND,
      version: 1,
      schema: ToolRowSchema,
      Component: ToolRowView,
    }),
  ];
  return () => {
    for (const remove of removers) if (typeof remove === "function") remove();
  };
}
