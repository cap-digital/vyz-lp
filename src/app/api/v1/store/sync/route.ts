// POST /api/v1/store/sync: logo depois da compra no app, relê a assinatura no
// RevenueCat (o webhook faz o mesmo; isto só adianta a tela).

import { apiJson, bearerSession, unauthorized } from "@/server/auth/bearer";
import { syncStoreSubscription } from "@/server/billing/store";

export async function POST(request: Request) {
  const session = await bearerSession(request);
  if (!session) return unauthorized();
  try {
    const subscriptionId = await syncStoreSubscription(session.userId);
    return apiJson({ subscriptionId });
  } catch (err) {
    const code = err instanceof Error && err.message.startsWith("store:") ? err.message : "store:sync_failed";
    return apiJson({ error: { code, message: "A assinatura foi feita na loja e aparece aqui em instantes." } }, 502);
  }
}
