import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: {
    default: "Gestão Empresarial",
    template: "%s — Gestão"
  },
  description: "Sistema de gestão empresarial: estoque, vendas, clientes e crediário em um só lugar."
};

const themeInitScript = `
(function(){try{
  var stored=localStorage.getItem('atelie:theme');
  var prefers=window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme=stored==='light'||stored==='dark'?stored:(prefers?'dark':'light');
  if(theme==='dark')document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme=theme;
}catch(e){}})();
`.trim();

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
