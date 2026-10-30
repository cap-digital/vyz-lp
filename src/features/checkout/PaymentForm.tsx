"use client";

// Passo 2: pagamento. Hoje simulado: o cartão é conferido aqui (Luhn,
// validade, código) e, como na Stripe (Elements), o número e o código nunca
// saem do navegador. O servidor recebe só bandeira, final e validade
// (payCheckout). PIX e boleto entram com a Stripe.

import { Barcode, CreditCard, LoaderCircle, Lock, QrCode } from "lucide-react";
import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { PendingChip } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { brl } from "@/lib/format";
import { payCheckout } from "@/server/billing/actions";
import { CARD_BRAND_LABEL, TEST_CARDS, cvcLength, detectBrand, formatCardNumber, formatExpiry, validateCard, type CardErrors, type CardInput } from "./card";
import { Field } from "./Field";

type PaymentFormProps = {
  checkoutId: string;
  amountCents: number;
  /** Nome de quem assina (sugestão para o nome no cartão). */
  holderName: string;
  /** Validade de exemplo no futuro ("12/30"). */
  sampleExpiry: string;
  simulated: boolean;
};

const FIELD_ORDER: (keyof CardInput)[] = ["number", "expiry", "cvc", "name"];

function Method({ icon, label, note, selected = false }: { icon: ReactNode; label: string; note?: string; selected?: boolean }) {
  return (
    <li
      aria-current={selected ? "true" : undefined}
      className={`flex min-w-0 items-center gap-2 rounded-control border px-3 py-2.5 text-[13.5px] ${
        selected ? "border-accent bg-accent-soft/40 font-semibold text-fg" : "border-dashed border-line text-fg-2"
      }`}
    >
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {note && <span className="block text-[11.5px] font-normal">{note}</span>}
      </span>
    </li>
  );
}

export function PaymentForm({ checkoutId, amountCents, holderName, sampleExpiry, simulated }: PaymentFormProps) {
  const id = useId();
  const [card, setCard] = useState<CardInput>({
    number: simulated ? TEST_CARDS.approved : "",
    expiry: simulated ? sampleExpiry : "",
    cvc: simulated ? "123" : "",
    name: holderName.toUpperCase(),
  });
  const [errors, setErrors] = useState<CardErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const brand = detectBrand(card.number);
  const fid = (key: keyof CardInput) => `${id}-${key}`;

  const set = (key: keyof CardInput, value: string) => {
    setCard((c) => ({ ...c, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    setFailure(null);
  };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const checked = validateCard(card, new Date());
    if (!checked.ok) {
      setErrors(checked.errors);
      const first = FIELD_ORDER.find((k) => checked.errors[k]);
      if (first) document.getElementById(fid(first))?.focus();
      return;
    }
    setErrors({});
    setFailure(null);
    startTransition(async () => {
      // sucesso redireciona para a tela de concluído; só o erro volta para cá
      const result = await payCheckout(checkoutId, { method: "card", ...checked.card });
      if (result && !result.ok) {
        setFailure(result.error.message);
        if (result.error.fields) setErrors(result.error.fields as CardErrors);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" aria-describedby={simulated ? `${id}-simulado` : undefined}>
      {simulated && (
        <div id={`${id}-simulado`} className="flex flex-wrap items-center gap-2">
          <PendingChip
            label="Pagamento simulado · nenhum valor é cobrado"
            detail="Esta versão aprova o pagamento na hora, sem falar com banco nenhum. A cobrança real entra com a Stripe."
          />
        </div>
      )}

      <div>
        <p className="text-[13.5px] font-medium text-fg">Forma de pagamento</p>
        <ul className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
          <Method icon={<CreditCard size={17} />} label="Cartão de crédito" selected />
          <Method icon={<QrCode size={17} />} label="PIX" note="com a Stripe" />
          <Method icon={<Barcode size={17} />} label="Boleto" note="com a Stripe" />
        </ul>
      </div>

      <fieldset className="space-y-4">
        <legend className="sr-only">Dados do cartão</legend>
        <Field
          id={fid("number")}
          label="Número do cartão"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          value={card.number}
          onChange={(v) => set("number", formatCardNumber(v))}
          error={errors.number}
          trailing={
            brand ? (
              <span className="rounded-chip border border-line px-2 py-0.5 text-[11.5px] font-semibold text-fg-2" aria-live="polite">
                {CARD_BRAND_LABEL[brand]}
              </span>
            ) : null
          }
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            id={fid("expiry")}
            label="Validade"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            maxLength={5}
            value={card.expiry}
            onChange={(v) => set("expiry", formatExpiry(v))}
            error={errors.expiry}
          />
          <Field
            id={fid("cvc")}
            label="Código de segurança"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder={brand === "amex" ? "4 dígitos" : "3 dígitos"}
            maxLength={cvcLength(brand)}
            value={card.cvc}
            onChange={(v) => set("cvc", v.replace(/\D/g, "").slice(0, cvcLength(brand)))}
            error={errors.cvc}
          />
        </div>
        <Field
          id={fid("name")}
          label="Nome impresso no cartão"
          autoComplete="cc-name"
          value={card.name}
          onChange={(v) => set("name", v.toUpperCase())}
          error={errors.name}
          maxLength={60}
        />
      </fieldset>

      {simulated && (
        <div className="rounded-control border border-dashed border-line px-4 py-3 text-[13px] text-fg-2">
          <p>
            Cartões de teste: <span className="font-medium text-fg tnum">{TEST_CARDS.approved}</span> aprova;{" "}
            <span className="font-medium text-fg tnum">{TEST_CARDS.declined}</span> simula recusa.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => set("number", TEST_CARDS.approved)}
              className="rounded-chip border border-line px-3 py-1 text-[12.5px] hover:border-accent hover:text-fg"
            >
              Usar cartão aprovado
            </button>
            <button
              type="button"
              onClick={() => set("number", TEST_CARDS.declined)}
              className="rounded-chip border border-line px-3 py-1 text-[12.5px] hover:border-accent hover:text-fg"
            >
              Simular recusa
            </button>
          </div>
        </div>
      )}

      {failure && (
        <p role="alert" className="rounded-control border border-error/40 bg-error-soft px-4 py-3 text-[14px] text-error-fg">
          {failure}
        </p>
      )}

      <div>
        <button type="submit" disabled={pending} className={`${btn.primary} w-full rounded-[10px]`}>
          {pending ? (
            <>
              <LoaderCircle size={18} aria-hidden className="animate-spin" />
              Processando o pagamento…
            </>
          ) : (
            <>
              <Lock size={16} aria-hidden />
              Pagar {brl(amountCents)}
            </>
          )}
        </button>
        <p className="mt-3 text-center text-[12.5px] text-fg-2">O número do cartão não sai do seu navegador: guardamos só a bandeira e o final.</p>
      </div>
    </form>
  );
}
