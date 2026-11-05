import { useEffect } from "react";
import type { PluginButtonIconProps } from "@getpaseo/plugin/client";
import { Icon, useToast } from "@getpaseo/plugin/client/ui";
import { progressGlyph, ringFraction } from "../shared/progress";
import { runs, useLatestRun } from "./runs";

const announced = new Set<string>();

/**
 * The Transfer header button's icon. Idle it is the plain arrows; while this workspace's transfer
 * runs it becomes a ring that fills as the bytes arrive; afterwards a green check or a red cross
 * until the person has seen how it ended. The ending also raises a toast when no panel shows it.
 */
export function TransferIcon(props: PluginButtonIconProps) {
  const run = useLatestRun(`${props.host.id}:${props.workspaceId}`);
  const toast = useToast();
  const c = props.theme.colors;
  const ended = run && run.state !== "running" ? run.state : null;
  useEffect(() => {
    if (!run || !ended || run.seen || announced.has(run.runId)) return;
    announced.add(run.runId);
    if (runs.watched(run.runId)) return;
    const verb = run.mode === "move" ? "Moved" : "Copied";
    if (ended === "done")
      toast.show(`${verb} ${run.workspaceName} to ${run.targetLabel}`, {
        variant: "success",
      });
    else
      toast.show(
        `${run.mode === "move" ? "Move" : "Copy"} to ${run.targetLabel} stopped. Open Transfer to see why.`,
        { variant: "error" },
      );
  }, [run?.runId, ended]);
  if (run?.state === "running")
    return (
      <Icon
        icon={{ svg: progressGlyph(ringFraction(run.stages, run.copied)) }}
        size={props.size}
        color={c.foreground}
      />
    );
  if (run && !run.seen && run.state === "done")
    return (
      <Icon name="CircleCheck" size={props.size} color={c.statusSuccess} />
    );
  if (run && !run.seen && run.state === "failed")
    return (
      <Icon
        name={run.lost ? "TriangleAlert" : "CircleX"}
        size={props.size}
        color={run.lost ? c.statusWarning : c.statusDanger}
      />
    );
  return <Icon name="ArrowRightLeft" size={props.size} color={props.color} />;
}
