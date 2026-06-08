import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import BTCPriceUpdater from "@/components/BTCPriceUpdater";
import { PrivacyProvider } from "@/components/PrivacyProvider";

export const metadata: Metadata = {
  title: "FinanceTracker — Personal Finance",
  description: "Track income, expenses, savings, investments and Bitcoin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-950 text-gray-100">
        <PrivacyProvider>
          {/* Auto-fetches BTC price on a configurable interval */}
          <BTCPriceUpdater />
          <Sidebar />
          <main className="lg:ml-64 min-h-screen">
            <div className="p-6 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </PrivacyProvider>
      </body>
    </html>
  );
}
