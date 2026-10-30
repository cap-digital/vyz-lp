// Raiz do app: sessão e navegação. Sem login, só a tela de entrar (o app não
// tem modo convidado).

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useTheme } from "@/ui/theme";

SplashScreen.preventAutoHideAsync();

function Navigation() {
  const { session, ready } = useAuth();
  const t = useTheme();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: t.bg }, headerTintColor: t.fg, contentStyle: { backgroundColor: t.bg } }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="entrar" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
