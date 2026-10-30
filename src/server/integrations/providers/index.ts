import "server-only";

// Escolhe o provedor: simulado com INTEGRATIONS_MODE=mock, real com live. Uma
// conexão gravada no modo simulado continua simulada (is_mock), mesmo depois
// de ligar o live: os tokens dela não valem no Meta nem no Google.

import type { ProviderId } from "@/features/integrations/providers";
import { isMockIntegrations } from "@/server/env";
import { googleProvider } from "./google";
import { metaProvider } from "./meta";
import { mockProvider } from "./mock";
import type { OAuthProvider } from "./types";

export function getProvider(id: ProviderId): OAuthProvider {
  if (isMockIntegrations()) return mockProvider(id);
  return id === "meta" ? metaProvider() : googleProvider();
}

/** Provedor de uma conexão já gravada. */
export function providerForConnection(conn: { provider: ProviderId; is_mock: boolean }): OAuthProvider {
  if (conn.is_mock) return mockProvider(conn.provider);
  return conn.provider === "meta" ? metaProvider() : googleProvider();
}

export { ProviderError } from "./types";
export type { DiscoveredAccount, OAuthProvider, OAuthTokens, ProviderProfile } from "./types";
