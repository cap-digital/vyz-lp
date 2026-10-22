import type { Metadata } from "next";
import { LoginPage } from "@/features/auth/LoginPage";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre no VYZ com e-mail ou Google.",
};

export default function Entrar() {
  return <LoginPage />;
}
