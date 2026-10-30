import { Stack } from "expo-router";
import { useTheme } from "@/ui/theme";

export default function AppLayout() {
  const t = useTheme();
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: t.bg }, headerTintColor: t.fg, headerShadowVisible: false, contentStyle: { backgroundColor: t.bg } }}>
      <Stack.Screen name="index" options={{ title: "Dashboards" }} />
      <Stack.Screen name="dashboards/[id]" options={{ title: "" }} />
      <Stack.Screen name="conta" options={{ title: "Conta", presentation: "modal" }} />
    </Stack>
  );
}
