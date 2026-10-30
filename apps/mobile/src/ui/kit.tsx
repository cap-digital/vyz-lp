// Peças básicas das telas: botão, campo, cartão, aviso.

import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "./theme";

export function Button({ label, onPress, busy, tone = "primary" }: { label: string; onPress: () => void; busy?: boolean; tone?: "primary" | "secondary" | "danger" }) {
  const t = useTheme();
  const bg = tone === "primary" ? t.accent : "transparent";
  const fg = tone === "primary" ? t.accentFg : tone === "danger" ? t.danger : t.fg;
  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={({ pressed }) => [s.button, { backgroundColor: bg, borderColor: tone === "primary" ? bg : t.line, opacity: pressed || busy ? 0.7 : 1 }]}>
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[s.buttonText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: t.fg2, fontSize: 13 }}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={t.fg2} style={[s.input, { color: t.fg, borderColor: t.line, backgroundColor: t.card }]} {...props} />
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>{children}</View>;
}

export function Notice({ text, tone = "error" }: { text: string | null; tone?: "error" | "info" }) {
  const t = useTheme();
  if (!text) return null;
  return <Text accessibilityLiveRegion="polite" style={{ color: tone === "error" ? t.danger : t.fg2, fontSize: 14 }}>{text}</Text>;
}

const s = StyleSheet.create({
  button: { height: 50, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { fontSize: 16, fontWeight: "600" },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 },
});
