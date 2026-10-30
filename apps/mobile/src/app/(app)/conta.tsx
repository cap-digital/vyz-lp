// Conta: saldo de créditos, compra pela loja, sair e excluir a conta.

import type { MeResponse } from "@vyz/shared";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { buy, creditPackages } from "@/lib/purchases";
import { Button, Card, Notice } from "@/ui/kit";
import { useTheme } from "@/ui/theme";

export default function Conta() {
  const t = useTheme();
  const auth = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () => api<MeResponse>("/me").then(setMe).catch(() => {});
  useEffect(() => {
    void refresh();
    creditPackages().then(setPackages).catch(() => setPackages([]));
  }, []);

  const purchase = async (pkg: PurchasesPackage) => {
    setBusy(pkg.identifier);
    setMessage(null);
    try {
      if (await buy(pkg)) {
        setMessage("Compra concluída. Os créditos aparecem em instantes.");
        setTimeout(refresh, 3000);
      }
    } catch {
      setMessage("A compra não foi concluída. Tente de novo.");
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = () =>
    Alert.alert("Excluir conta", "Sua conta e seus dados de acesso serão apagados. Isso não pode ser desfeito.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          setBusy("delete");
          const err = await auth.deleteAccount();
          setBusy(null);
          if (err) setMessage(err);
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Card>
        <Text style={{ color: t.fg, fontSize: 17, fontWeight: "600" }}>{me?.user.fullName || "Sua conta"}</Text>
        <Text style={{ color: t.fg2 }}>{me?.user.email}</Text>
      </Card>
      <Card>
        <Text style={{ color: t.fg2, fontSize: 13 }}>Créditos</Text>
        <Text style={{ color: t.fg, fontSize: 28, fontWeight: "700" }}>{me?.credits ?? 0}</Text>
        {packages.map((p) => (
          <Button key={p.identifier} tone="secondary" label={`${p.product.title} · ${p.product.priceString}`} busy={busy === p.identifier} onPress={() => purchase(p)} />
        ))}
      </Card>
      <Notice text={message} tone="info" />
      <Button tone="secondary" label="Sair" onPress={() => void auth.signOut()} />
      <Button tone="danger" label="Excluir conta" busy={busy === "delete"} onPress={confirmDelete} />
    </ScrollView>
  );
}
