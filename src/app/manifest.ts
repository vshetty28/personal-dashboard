import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brief",
    short_name: "Brief",
    description: "Personal morning brief",
    start_url: "/",
    display: "standalone",
    background_color: "#0F0F0E",
    theme_color: "#0F0F0E",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
