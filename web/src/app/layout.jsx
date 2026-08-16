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
  title: "Дизайн по Плану — визуализация интерьеров",
  description: "Фотореалистичный ремонт квартиры по техпаспорту: анализ плана, стили и генерация по комнатам.",
  icons: {
    icon: [
      { url: "/logo-dark.png", type: "image/png" },
      { url: "/logo-en-dark.png", type: "image/png", media: "(prefers-color-scheme: dark)" },
      { url: "/logo-light.jpg", type: "image/jpeg", media: "(prefers-color-scheme: light)" },
    ],
    apple: "/logo-dark.png",
  },
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
