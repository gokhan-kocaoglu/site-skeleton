import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Site Skeleton — Monorepo Starter for Production Web Apps",
    template: "%s | Site Skeleton",
  },
  description:
    "A production-ready web project skeleton: Next.js 15 storefront, Vite + React admin panel, and a Spring Boot 3 API with PostgreSQL and Flyway migrations.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Site Skeleton",
    description:
      "Production-ready monorepo starter: Next.js 15, Vite + React admin, Spring Boot 3 API.",
    url: baseUrl,
    siteName: "Site Skeleton",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
