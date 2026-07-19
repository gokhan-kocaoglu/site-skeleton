import { ImageResponse } from "next/og";

/**
 * Default Open Graph image (1200x630), generated at build time (audit #13 /
 * SEO HIGH finding). Colors come from satori's built-in Tailwind palette via
 * the `tw` prop — no raw hex, no runtime inline styles in app UI code.
 * Real projects replace this with a branded asset.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Site Skeleton — production-ready monorepo starter: Next.js, Vite + React admin, Spring Boot API";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div tw="flex h-full w-full flex-col items-center justify-center bg-slate-900 text-slate-50">
        <div tw="text-8xl font-bold">Site Skeleton</div>
        <div tw="mt-6 text-4xl text-slate-300">
          Next.js · Vite + React · Spring Boot
        </div>
      </div>
    ),
    size
  );
}
