// @ts-check
/* global process */
import { defineConfig } from "astro/config";

// GitHub Pages serves this repo at https://muhamadmursyied.github.io/Mursyied-Portfolio/.
// With a custom domain (or a MuhamadMursyied.github.io repo) set SITE_URL and BASE_PATH="/".
export default defineConfig({
  site: process.env.SITE_URL || "https://muhamadmursyied.github.io",
  base: process.env.BASE_PATH || "/Mursyied-Portfolio",
  trailingSlash: "ignore",
});
