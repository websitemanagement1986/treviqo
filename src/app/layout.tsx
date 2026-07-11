import type { Metadata } from "next";
import { getSiteConfig, themeToCssVars } from "@/lib/site-loader";
import { SiteProvider } from "@/context/SiteContext";
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/layout/Header";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const siteConfig = getSiteConfig();
const cssVars = themeToCssVars(siteConfig.theme);

export const metadata: Metadata = {
  title: {
    default: siteConfig.site.name,
    template: `%s | ${siteConfig.site.name}`,
  },
  description: siteConfig.site.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={cssVars as React.CSSProperties}>
        <SiteProvider config={siteConfig}>
          <CartProvider>
            <Header />
            <MegaMenu />
            <main className="min-h-[60vh]">{children}</main>
            <Footer />
          </CartProvider>
        </SiteProvider>
      </body>
    </html>
  );
}
