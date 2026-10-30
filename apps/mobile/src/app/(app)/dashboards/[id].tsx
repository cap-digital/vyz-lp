// Dashboard: os números do período, já calculados no servidor (os mesmos do site).

import type { ApiKpi, DashboardDataResponse } from "@vyz/shared";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { api } from "@/lib/api";
import { Card, Notice } from "@/ui/kit";
import { useTheme } from "@/ui/theme";

function formatValue(k: ApiKpi, currency: string) {
  if (k.value === null) return "—";
  const nf = (o: Intl.NumberFormatOptions) => new Intl.NumberFormat("pt-BR", o).format(k.value!);
  switch (k.format) {
    case "money":
      return nf({ style: "currency", currency, maximumFractionDigits: 0 });
    case "pct":
      return nf({ style: "percent", maximumFractionDigits: 2 });
    case "ratio":
      return `${nf({ maximumFractionDigits: 2 })}×`;
    case "decimal":
      return nf({ maximumFractionDigits: 2 });
    default:
      return nf({ maximumFractionDigits: 0 });
  }
}

export default function DashboardScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<DashboardDataResponse["dashboard"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData((await api<DashboardDataResponse>(`/dashboards/${id}?periodo=30d`)).dashboard);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Stack.Screen options={{ title: data?.dashboard.name ?? "" }} />
      <Notice text={error} />
      {data && <Text style={{ color: t.fg2 }}>Últimos {data.current.days} dias</Text>}
      {data?.status === "no_data" && <Text style={{ color: t.fg2 }}>Os dados ainda estão chegando.</Text>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {data?.view.kpis.map((k) => {
          const good = k.delta === null || k.better === "neutral" ? null : (k.delta > 0) === (k.better === "up");
          return (
            <View key={k.id} style={{ width: "47%" }}>
              <Card>
                <Text style={{ color: t.fg2, fontSize: 13 }}>{k.label}</Text>
                <Text style={{ color: t.fg, fontSize: 22, fontWeight: "700" }}>{formatValue(k, data.currency)}</Text>
                {k.delta !== null && (
                  <Text style={{ color: good === null ? t.fg2 : good ? t.good : t.danger, fontSize: 13 }}>
                    {k.delta > 0 ? "▲" : "▼"} {new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(Math.abs(k.delta))}
                  </Text>
                )}
              </Card>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
