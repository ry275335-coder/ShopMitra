import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AppContextProvider } from "@/components/common/AppContext";

export const metadata: Metadata = {
  title: "ShopMitra - Local Price Discovery & Nearby Shops",
  description:
    "Discover nearby physical shops, compare live product rates, check stock availability, and support your local neighborhood retailers.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "ShopMitra - Local Price Discovery & Nearby Shops",
    description:
      "Find who has it in stock at the lowest price within your neighborhood.",
    type: "website",
    siteName: "ShopMitra",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="h-full w-full overflow-x-hidden bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <ToastProvider>
          <AppContextProvider>
            {children}
          </AppContextProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
