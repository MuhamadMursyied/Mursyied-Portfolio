// Small helpers shared by pages.

/** Prefixes a path inside the site with the base path (the repo name on GitHub Pages). */
export function url(path = ""): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (/^(https?:|mailto:|#)/.test(path)) return path;
  return `${base}/${path.replace(/^\//, "")}`;
}

/** "2024" -> "2024", "2026-10" -> "Oct 2026", "2026-10-05" -> "5 Oct 2026" */
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  if (!month) return year;
  const d = new Date(Number(year), Number(month) - 1, Number(day) || 1);
  const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
  if (day) opts.day = "numeric";
  return d.toLocaleDateString("en-GB", opts);
}

/** **bold** -> <strong>bold</strong>, with everything else HTML-escaped. */
export function bold(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/** Newest first, featured projects on top. */
export function sortProjects<T extends { data: { date?: string; featured: boolean } }>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => Number(b.data.featured) - Number(a.data.featured) || (b.data.date ?? "").localeCompare(a.data.date ?? ""),
  );
}

/** The small line above a project title: "MIMOS Berhad · 2026", "2024", ... */
export function projectMeta(data: { date?: string; org?: string }): string {
  return [data.org, data.date && formatDate(data.date)].filter(Boolean).join(" · ");
}
