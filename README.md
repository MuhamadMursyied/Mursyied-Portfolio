# Mursyied · Portfolio

My personal portfolio: a mechatronics engineer working on unmanned ground vehicles with ROS 2. Home, About and Work pages, a live Kuala Lumpur clock, dark and light themes, a background that follows the mouse, and a page for each project.

Built on the [Magic Portfolio](https://github.com/once-ui-system/magic-portfolio) template by [Once UI](https://once-ui.com) for [Next.js](https://nextjs.org).

![Portfolio home page](docs/home.png)

## Run it locally

Needs Node.js 20.9 or later.

```bash
git clone https://github.com/MuhamadMursyied/mursyied-portfolio.git
cd mursyied-portfolio
npm install
npm run dev        # http://localhost:3000
```

Check a production build before pushing:

```bash
npx tsc --noEmit
npm run build
```

## Where to edit things

| What | File |
| --- | --- |
| Name, photo, headline, work experience, studies, certifications, skills | `src/resources/content.tsx` |
| Colours, dark/light default, background effects, which pages are on | `src/resources/once-ui.config.ts` |
| Projects (one file per project) | `src/app/work/projects/*.mdx` |
| Images | `public/images/` |
| Skill and nav icons | `src/resources/icons.ts` |

### Add a project

Create `src/app/work/projects/my-project.mdx`:

```mdx
---
title: "UGV autonomous navigation"
publishedAt: "2026-11"          # "2026", "2026-11" or "2026-11-05"
summary: "One or two lines shown on the card."
images:
  - "/images/projects/my-project-1.jpg"
link: "https://github.com/MuhamadMursyied/..."   # optional
---

## Overview

What the problem was, what you did and how it turned out.
```

Projects are sorted newest first. The newest one is shown large on the home page.

The robotics projects currently use generated title cards as covers (`public/images/projects/*.jpg`). Swap them for real photos or RViz/Gazebo screenshots when you have them, keeping a 16:9 shape.

### Blog and gallery

Both pages are switched off. To use them, add `.mdx` posts to `src/app/blog/posts` or photos to `gallery.images` in `content.tsx`, then set `"/blog"` or `"/gallery"` to `true` in `once-ui.config.ts`.

## Deploy on Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project**, import `mursyied-portfolio`, keep the defaults and click **Deploy**.
3. Every push to `main` redeploys the site.

The site address used for SEO is picked up from Vercel automatically. With a custom domain (Vercel → Project → Settings → Domains), also set the environment variable `NEXT_PUBLIC_SITE_URL` to `https://your-domain`.

## Changes from the template

- My content, projects, skills with icons and a certifications section on the About page.
- Skills shown as icon chips on the home page.
- Dark theme by default (the template ignored the `theme` setting) and mouse-following background.
- Project dates can be a year or a month (`"2024"`, `"2026-10"`) and display that way.
- Blog, gallery, newsletter and password-protected pages turned off.

## License

The template is licensed under [CC BY-NC 4.0](LICENSE): free for personal, non-commercial use with credit to Once UI, which the footer keeps. My content and images are my own.
