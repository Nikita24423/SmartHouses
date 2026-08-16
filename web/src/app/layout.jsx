import "./globals.css";
import Script from "next/script";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import ThemeToggle from "./theme-toggle";
import { Providers } from "@/components/providers";

const themeBootScript = `try {
  const key = "designvision:theme:v1";
  const saved = localStorage.getItem(key);
  const theme = saved === "light" || saved === "dark"
    ? saved
    : matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
} catch {}`;

export const metadata = {
  title: "DesignVision — визуализация интерьера",
  description: "Создавайте реалистичные варианты интерьера для своей комнаты.",
};

export default function RootLayout({ children }) {
  return (
    <html
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      data-theme="dark"
      lang="ru"
      suppressHydrationWarning
    >
      <body className={GeistSans.className}>
        <Script id="theme-bootstrap" strategy="beforeInteractive">{themeBootScript}</Script>
        <Providers>
          <ThemeToggle />
          {children}
        </Providers>
      </body>
    </html>
  );
}
