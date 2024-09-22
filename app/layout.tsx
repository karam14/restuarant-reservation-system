// app/layout.tsx
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import ClientLayout from "./client-layout";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Athene's Olijf Reserveringssysteem",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ClientLayout>
        {children}
        </ClientLayout>
      </body>
    </html>
  );
}
