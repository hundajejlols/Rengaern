import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Ivern & Rengar Challenge Tracker",
  description: "Śledzenie challenge'u: jeden gracz = jeden champion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
