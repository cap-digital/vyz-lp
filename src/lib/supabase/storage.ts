// URLs públicas do Storage (bucket brand-assets é público para leitura).

import { PUBLIC_ENV } from "@/lib/env.public";

export const BRAND_BUCKET = "brand-assets";

export function publicAssetUrl(path: string | null | undefined, bucket = BRAND_BUCKET): string | null {
  if (!path) return null;
  const clean = path.split("/").map(encodeURIComponent).join("/");
  return `${PUBLIC_ENV.supabaseUrl}/storage/v1/object/public/${bucket}/${clean}`;
}
