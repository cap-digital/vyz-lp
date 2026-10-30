import { ShareMessage } from "@/features/share/SharedDashboard";

// 404 do link público: token inválido ou que não existe.
export default function NotFound() {
  return <ShareMessage kind="invalid" />;
}
