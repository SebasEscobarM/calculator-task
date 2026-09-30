import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calculator",
  description: "A calculator whose arithmetic runs on a Go REST API.",
};

export const viewport: Viewport = {
  themeColor: "#2b353b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-charcoal-deep text-platinum antialiased">{children}</body>
    </html>
  );
}
