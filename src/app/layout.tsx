import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const helveticaNeueExt = localFont({
  src: "../../public/fonts/HelveticaNeueLTPro53Extended.otf",
  variable: "--font-dni",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mi Argentina",
  description: "Registrate para obtener tu DNI digital",
  icons: {
    icon: "/icons/favicon.svg",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mi Argentina",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#3730ba",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" translate="no" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${helveticaNeueExt.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" }}
      >
        {children}
        <Toaster />
        {/* Register Service Worker for PWA */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        ` }} />
        {/* Hide Next.js dev tools indicator for clean preview */}
        <style dangerouslySetInnerHTML={{ __html: `[data-nextjs-dialog-overlay], [data-nextjs-toast] { display: none !important; }` }} />
      </body>
    </html>
  );
}
