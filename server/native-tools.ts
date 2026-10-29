import {
  defineAgentTool,
  type PluginServerContext,
} from "@getpaseo/plugin/server";
import { z } from "zod";
import { hosts, status } from "./handlers";
import { registerAgentTools } from "./agent-tools";
export function contributeAgentTools(server: PluginServerContext) {
  return registerAgentTools(server, [
    defineAgentTool({
      name: "transfer_list_hosts",
      description:
        "List configured SSH and Tailscale transfer destinations. Discovery does not connect to hosts, copy files or archive workspaces. Use the Transfer screen to preview and approve a transfer.",
      input: z.object({}).strict(),
      async execute(_, { signal }) {
        if (signal.aborted) throw new Error("Tool call cancelled.");
        const result = await hosts();
        return { text: JSON.stringify(result), structuredContent: result };
      },
    }),
    defineAgentTool({
      name: "transfer_run_status",
      description:
        "Read progress and verification of an existing workspace transfer by run ID. Does not start or retry a transfer.",
      input: z.object({ runId: z.string().min(1).max(200) }).strict(),
      execute(input, { signal }) {
        if (signal.aborted) throw new Error("Tool call cancelled.");
        const result = status(input);
        return { text: JSON.stringify(result), structuredContent: result };
      },
    }),
  ]);
}
