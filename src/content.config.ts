import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// One Markdown file per project in src/content/projects.
const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.string().optional(), // "2024", "2026-10" or "2026-10-05"
    org: z.string().optional(), // where it was done, e.g. "MIMOS Berhad"
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    images: z.array(z.string()).default([]), // paths inside public/, first one is the cover
    featured: z.boolean().default(false), // featured projects are listed first
    draft: z.boolean().default(false), // drafts are not published
  }),
});

export const collections = { projects };
