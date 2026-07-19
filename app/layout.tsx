import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/nunito-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taskmgr — Em breve",
  description: "Uma nova forma de organizar o trabalho está chegando.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('taskmgr-theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
