import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "גן אצטרובל — טפסי הסכמה",
  description: "מערכת לחתימה דיגיטלית על טפסי הסכמת הורים לאירועי הגן",
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
