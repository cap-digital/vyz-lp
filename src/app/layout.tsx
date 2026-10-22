import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const description =
  "Conecte Meta Ads, Google Ads e GA4 e tenha o dashboard do seu cliente pronto, com CPA, ROAS e funil no topo. Landing pages com GTM configurado.";

export const metadata: Metadata = {
  title: "VYZ · Dashboards e landing pages para gestores de tráfego",
  description,
  applicationName: "VYZ",
  openGraph: {
    title: "VYZ · Dashboards e landing pages para gestores de tráfego",
    description,
    siteName: "VYZ",
    locale: "pt_BR",
    type: "website",
  },
  // TODO: remover no lançamento
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E8ECE1" },
    { media: "(prefers-color-scheme: dark)", color: "#1E1E1E" },
  ],
};

// Aplica o tema salvo antes da primeira pintura. Sem valor salvo, o CSS segue o sistema.
const themeScript = `(function(){try{var t=localStorage.getItem("vyz-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh overflow-x-clip">{children}</body>
    </html>
  );
}
