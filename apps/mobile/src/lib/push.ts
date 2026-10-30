// Notificações: token nativo do aparelho (APNs no iOS, FCM no Android),
// registrado no nosso backend, que envia direto (sem serviço de terceiros).

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";

let lastToken: string | null = null;

export async function registerPush() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const device = await Notifications.getDevicePushTokenAsync();
    lastToken = String(device.data);
    await api("/push-tokens", {
      method: "POST",
      body: JSON.stringify({ platform: Platform.OS === "ios" ? "ios" : "android", token: lastToken, appVersion: Constants.expoConfig?.version }),
    });
  } catch {
    // sem permissão ou sem rede: tenta de novo na próxima abertura
  }
}

export async function unregisterPush() {
  if (!lastToken) return;
  await api(`/push-tokens?token=${encodeURIComponent(lastToken)}`, { method: "DELETE" }).catch(() => {});
  lastToken = null;
}
