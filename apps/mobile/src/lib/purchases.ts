// Compras dentro do app (créditos), pela loja via RevenueCat. O app só compra
// e mostra; quem credita é o webhook do backend (/api/webhooks/revenuecat).

import { Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { ENV } from "./env";

let configured = false;

function configure() {
  if (configured) return true;
  const apiKey = Platform.OS === "ios" ? ENV.revenueCatIosKey : ENV.revenueCatAndroidKey;
  if (!apiKey) return false;
  Purchases.configure({ apiKey });
  configured = true;
  return true;
}

/** O usuário do RevenueCat é o id do Supabase: o webhook sabe quem creditar. */
export async function identifyPurchases(userId: string) {
  if (configure()) await Purchases.logIn(userId).catch(() => {});
}

export async function resetPurchases() {
  if (configured) await Purchases.logOut().catch(() => {});
}

export async function creditPackages(): Promise<PurchasesPackage[]> {
  if (!configure()) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

/** true = comprou; false = cancelou. Lança em erro da loja. */
export async function buy(pkg: PurchasesPackage): Promise<boolean> {
  try {
    await Purchases.purchasePackage(pkg);
    return true;
  } catch (err) {
    if ((err as { userCancelled?: boolean }).userCancelled) return false;
    throw err;
  }
}
