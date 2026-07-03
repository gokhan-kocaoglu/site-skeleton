/**
 * Twitter card image: same asset as the Open Graph default. Next.js does not
 * derive twitter:image from og:image, so the convention file is re-exported
 * (SEO HIGH finding, 2026-07-02 audit).
 */
export { default, size, contentType, alt } from "./opengraph-image";
