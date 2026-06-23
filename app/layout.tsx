import type { Metadata } from "next";
import "@/styles/globals.css";
import SmoothScroll from "@/components/shared/SmoothScroll";
import StoreProvider from "./StoreProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Resale AI",
  description: "something about resale ai",
  icons: {
    icon: "/images/fav.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="manrope">
      <body className="antialiased">
        <StoreProvider>
          <SmoothScroll>{children}</SmoothScroll>
          <Toaster position="top-center" richColors />
        </StoreProvider>
      </body>
    </html>
  );
}
