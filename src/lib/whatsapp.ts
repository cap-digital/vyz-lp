import { WHATSAPP_NUMBER } from "@/features/pricing/pricing";

/** Link do WhatsApp com a mensagem pronta (abre em nova aba). */
export function waLink(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const MSG_SPECIALIST = "Olá, VYZ! Quero montar um plano com um especialista.";
export const MSG_SEGMENT = "Olá, VYZ! Quero um dashboard para o meu segmento: ";
export const MSG_OVER_30 = "Olá, VYZ! Tenho mais de 30 contas para conectar e quero montar um plano com um especialista.";
export const MSG_WHITE_LABEL = "Olá, VYZ! Quero o Personalizado com a minha marca.";
export const MSG_LP_TEAM = "Olá, VYZ! Quero uma landing page feita pelo time.";
