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

// Where the work was done, newest job first; anything else (university projects) comes after.
const orgRank = ["MIMOS Berhad", "SD Guthrie", "Self learning"];

/** Newest job first (MIMOS, SD Guthrie, self learning, then the rest), trainings last, newest first within each. */
export function sortProjects<T extends { data: { date?: string; org?: string; tags: string[] } }>(list: T[]): T[] {
  const isTraining = (p: T) => Number(p.data.tags.includes("Training"));
  const rank = (p: T) => {
    const i = orgRank.indexOf(p.data.org ?? "");
    return i === -1 ? orgRank.length : i;
  };
  return [...list].sort(
    (a, b) =>
      isTraining(a) - isTraining(b) ||
      rank(a) - rank(b) ||
      (b.data.date ?? "0").localeCompare(a.data.date ?? "0"),
  );
}

/** The small line above a project title: "MIMOS Berhad · 2026", "2024", ... */
export function projectMeta(data: { date?: string; org?: string }): string {
  return [data.org, data.date && formatDate(data.date)].filter(Boolean).join(" · ");
}
