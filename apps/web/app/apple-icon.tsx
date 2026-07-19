import { ImageResponse } from "next/og";

/**
 * Apple touch icon (180x180), generated at build time. ImageResponse renders
 * outside the CSS pipeline and cannot resolve tokens.css custom properties,
 * so design-token VALUES are inlined as raw hex:
 *   #4f46e5 = --color-primary
 *   #ffffff = --color-primary-foreground
 * This file is therefore listed in the manifest hex rule's excludePaths
 * (same exemption class as tokens.css). Real projects replace this with a
 * branded asset.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div tw="flex h-full w-full flex-col items-center justify-center bg-[#4f46e5]">
        <div tw="flex flex-col">
          <div tw="h-4 w-24 rounded-full bg-[#ffffff]" />
          <div tw="mt-4 h-4 w-16 rounded-full bg-[#ffffff]" />
          <div tw="mt-4 h-4 w-24 rounded-full bg-[#ffffff]" />
        </div>
      </div>
    ),
    size
  );
}
