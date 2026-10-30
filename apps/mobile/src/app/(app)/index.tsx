// Dashboards do workspace aberto.

import type { DashboardsResponse, MeResponse } from "@vyz/shared";
import { Link, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text } from "react-native";
import { api } from "@/lib/api";
import { Card, Notice } from "@/ui/kit";
import { useTheme } from "@/ui/theme";

export default function Dashboards() {
  const t = useTheme();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [items, setItems] = useState<DashboardsResponse["dashboards"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const m = await api<MeResponse>("/me");
      setMe(m);
      const ws = m.defaultWorkspaceId;
      setItems(ws ? (await api<DashboardsResponse>(`/workspaces/${ws}/dashboards`)).dashboards : []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const workspace = me?.workspaces.find((w) => w.id === me.defaultWorkspaceId);
  return (
    <>
      <Stack.Screen options={{ headerRight: () => <Link href="/conta" style={{ color: t.accent, fontSize: 16 }}>Conta</Link> }} />
      <FlatList
        contentContainerStyle={{ padding: 16, gap: 12 }}
        data={items}
        keyExtractor={(d) => d.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <>
            {workspace && <Text style={{ color: t.fg2, marginBottom: 4 }}>{workspace.name}</Text>}
            <Notice text={error} />
          </>
        }
        ListEmptyComponent={loading ? undefined : <Text style={{ color: t.fg2 }}>Nenhum dashboard ainda. Crie o primeiro no painel.</Text>}
        renderItem={({ item }) => (
          <Link href={{ pathname: "/dashboards/[id]", params: { id: item.id } }} asChild>
            <Pressable accessibilityRole="button">
              <Card>
                <Text style={{ color: t.fg, fontSize: 17, fontWeight: "600" }}>{item.name}</Text>
                {!!item.clientName && <Text style={{ color: t.fg2 }}>{item.clientName}</Text>}
              </Card>
            </Pressable>
          </Link>
        )}
      />
    </>
  );
}
