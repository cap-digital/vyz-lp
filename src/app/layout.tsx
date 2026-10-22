import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { HtmlFlags } from "@/components/state/HtmlFlags";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const title = "VYZ · Dashboards e landing pages para gestores de tráfego";
const description =
  "Conecte Meta Ads, Google Ads e GA4 e tenha o dashboard do seu cliente pronto, com CPA, ROAS e funil no topo. Landing pages com GTM configurado.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "VYZ",
  openGraph: { title, description, siteName: "VYZ", locale: "pt_BR", type: "website" },
  twitter: { card: "summary_large_image", title, description },
  // TODO: remover no lançamento
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1E1E1E",
  colorScheme: "dark light",
};

// Roda antes da primeira pintura: tema salvo (o padrão é o escuro), marca que
// há JS e decide se a intro da sessão roda.
const bootScript = `(function(){var d=document.documentElement;d.setAttribute("data-js","");try{var t=localStorage.getItem("vyz-theme");if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}try{if(!sessionStorage.getItem("vyz-intro")&&!location.hash&&!matchMedia("(prefers-reduced-motion: reduce)").matches)d.setAttribute("data-intro","")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh overflow-x-clip">
        <HtmlFlags />
        {children}
      </body>
    </html>
  );
}
