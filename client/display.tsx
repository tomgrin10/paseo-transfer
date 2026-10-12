import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  useSettings,
  type PluginClientContext,
  type PluginSurfaceProps,
} from "@getpaseo/plugin/client";
import {
  SettingsAction,
  SettingsCard,
  SettingsSection,
  SettingsSwitch,
} from "@getpaseo/plugin/client/ui";
import { displayPreferences, displayRpc } from "../shared/display";

const listeners = new Set<(show: boolean) => void>();

function DisplaySettings({ theme }: PluginSurfaceProps) {
  const settings = useSettings(displayPreferences);
  const visible =
    settings.status === "ready" ? settings.values.showSidebar : undefined;
  useEffect(() => {
    if (visible !== undefined)
      for (const listener of listeners) listener(visible);
  }, [visible]);
  if (settings.status === "loading")
    return <ActivityIndicator accessibilityLabel="Loading Transfer settings" />;
  if (settings.status !== "ready")
    return (
      <SettingsCard>
        <SettingsAction
          label={settings.error}
          actionLabel="Retry"
          onPress={() => void settings.reload()}
        />
        {settings.status === "invalid" && (
          <SettingsAction
            label="Restore default display settings"
            actionLabel="Reset"
            disabled={settings.saving}
            onPress={() => void settings.reset()}
          />
        )}
      </SettingsCard>
    );
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <SettingsSection title="Navigation">
        <SettingsCard>
          <SettingsSwitch
            label="Show in sidebar"
            hint="Transfer is always available from the button at the top right of a workspace. The sidebar is hidden by default."
            value={settings.values.showSidebar}
            disabled={settings.saving}
            onValueChange={(showSidebar) =>
              void settings.save({ showSidebar }, settings.revision)
            }
          />
        </SettingsCard>
      </SettingsSection>
      {settings.saveError && (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.colors.statusDanger }}
        >
          {settings.saveError}
        </Text>
      )}
    </View>
  );
}

export function contributeDisplay(client: PluginClientContext) {
  let removeSidebar: (() => void) | null = null;
  let disposed = false;
  let pending = false;
  let generation = 0;
  const show = (visible: boolean) => {
    if (disposed) return;
    if (visible && !removeSidebar)
      removeSidebar = client.addSidebarItem({
        id: "transfer",
        title: "Transfer",
        icon: "ArrowRightLeft",
        surface: "transfer",
      });
    if (!visible && removeSidebar) {
      removeSidebar();
      removeSidebar = null;
    }
  };
  const notify = (visible: boolean) => {
    generation += 1;
    show(visible);
  };
  listeners.add(notify);
  const removeSettings = client.addSettingsScreen({
    id: "display",
    title: "Display",
    icon: "PanelLeft",
    Component: DisplaySettings,
  });
  const refresh = async () => {
    if (disposed || pending) return;
    pending = true;
    const current = generation;
    try {
      const result = await client.rpc(displayRpc.read, {});
      if (!disposed && generation === current && result.status === "ready") {
        const values = displayPreferences.schema.safeParse(result.values);
        if (values.success) show(values.data.showSidebar);
      }
    } catch {
      /* Keep the last saved preference until reconnect. */
    } finally {
      pending = false;
    }
  };
  void refresh();
  const timer = setInterval(() => void refresh(), 5000);
  return () => {
    disposed = true;
    clearInterval(timer);
    listeners.delete(notify);
    removeSidebar?.();
    removeSettings();
  };
}
