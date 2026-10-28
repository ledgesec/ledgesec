import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/fsd/pages/home/overview";
import { ICON_192, ICON_512, ICON_MASKABLE, THEME_COLOR } from "@/shared/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    lang: "en",
    icons: [
      { src: ICON_192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: ICON_512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: ICON_MASKABLE, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
