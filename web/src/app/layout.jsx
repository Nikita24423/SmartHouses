import "./globals.css";
import Script from "next/script";
import ThemeToggle from "./theme-toggle";

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
    <html data-theme="dark" lang="ru" suppressHydrationWarning>
      <body>
        <Script id="theme-bootstrap" strategy="beforeInteractive">{themeBootScript}</Script>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
