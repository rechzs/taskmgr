import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/nunito-sans";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://taskmgr-production-731d.up.railway.app"),
  title: "KAGE — Dojo de Performance",
  description: "Transforme hábitos em missões, disciplina em níveis e semanas perfeitas em troféus.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "KAGE — Dojo de Performance",
    description: "Domine o dia. Forje o destino.",
    images: [{ url: "/og.png", width: 1672, height: 940, alt: "KAGE — dojo gamificado de performance" }],
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('taskmgr-theme');document.documentElement.classList.toggle('dark',t?t==='dark':true)}catch(e){document.documentElement.classList.add('dark')}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
