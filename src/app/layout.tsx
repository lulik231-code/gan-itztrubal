import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "גן אצטרובל — טפסי הסכמה",
  description: "מערכת לחתימה דיגיטלית על טפסי הסכמת הורים לאירועי הגן",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "גן אצטרובל", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2F5233",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-pine-dark">
        {children}
      </body>
    </html>
  );
}
