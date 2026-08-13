import "./globals.css";

export const metadata = {
  title: "DesignVision — визуализация интерьера",
  description: "Контекстная визуализация интерьера с сохранением истории изменений.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
