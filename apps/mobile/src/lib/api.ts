// Chamadas à API do site (/api/v1) com o token da sessão.

import type { ApiError } from "@vyz/shared";
import { ENV } from "./env";
import { supabase } from "./supabase";

export class ApiFailure extends Error {
  constructor(readonly status: number, readonly error: ApiError) {
    super(error.message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${ENV.apiUrl}/api/v1${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiFailure(res.status, body?.error ?? { code: "unknown", message: "Algo deu errado. Tente de novo." });
  return body as T;
}
