import "./globals.css";

export const metadata = {
  title: "DesignVision — визуализация интерьера",
  description: "Создавайте реалистичные варианты интерьера для своей комнаты.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
