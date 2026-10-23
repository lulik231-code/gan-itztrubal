import type { MetadataRoute } from "next";

// Lets the admin "install" the site to the phone's home screen. It opens
// straight into the admin dashboard (or the login page if signed out).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "גן אצטרובל - ניהול",
    short_name: "גן אצטרובל",
    description: "ניהול טפסי הסכמה של גן אצטרובל",
    start_url: "/admin/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "he",
    dir: "rtl",
    background_color: "#F8F4EE",
    theme_color: "#2F5233",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
