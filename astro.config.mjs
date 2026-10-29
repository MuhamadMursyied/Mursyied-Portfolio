// @ts-check
/* global process */
import { defineConfig } from "astro/config";

// The site is served from a sub-folder on GitHub Pages
// (https://muhamadmursyied.github.io/Mursyied-Portfolio/) but from the root on Vercel.
// Vercel sets VERCEL=1 during its build, so pick the right base automatically.
// With a custom domain set SITE_URL and BASE_PATH="/".
const onVercel = Boolean(process.env.VERCEL);
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export default defineConfig({
  site: process.env.SITE_URL || (onVercel && vercelUrl ? `https://${vercelUrl}` : "https://muhamadmursyied.github.io"),
  base: process.env.BASE_PATH || (onVercel ? "/" : "/Mursyied-Portfolio"),
  trailingSlash: "ignore",
});
