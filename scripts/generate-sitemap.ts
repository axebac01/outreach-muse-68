// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://maillead.ai";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Keep blog slugs in sync with src/data/blogPosts.tsx
const BLOG_SLUGS: { slug: string; publishedAt: string }[] = [
  { slug: "outbound-trender-2026", publishedAt: "2026-06-10" },
  { slug: "bygga-outbound-fran-noll", publishedAt: "2026-06-05" },
  { slug: "gdpr-cold-email-sverige-2026", publishedAt: "2026-05-28" },
];

const today = new Date().toISOString().split("T")[0];

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0", lastmod: today },
  { path: "/pricing", changefreq: "monthly", priority: "0.8", lastmod: today },
  { path: "/kalla-mejl", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/b2b-leads-sverige", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/e-postutskick-foretag", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/cold-email-mall", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/jamfor/maillead-vs-apollo", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/jamfor/maillead-vs-lemlist", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/blogg", changefreq: "weekly", priority: "0.7", lastmod: today },
  ...BLOG_SLUGS.map((p) => ({
    path: `/blogg/${p.slug}`,
    changefreq: "monthly" as const,
    priority: "0.6",
    lastmod: p.publishedAt,
  })),
  { path: "/login", changefreq: "yearly", priority: "0.3" },
  { path: "/legal/privacy", changefreq: "monthly", priority: "0.4" },
  { path: "/legal/terms", changefreq: "monthly", priority: "0.4" },
  { path: "/legal/cookies", changefreq: "monthly", priority: "0.3" },
  { path: "/legal/subprocessors", changefreq: "monthly", priority: "0.3" },
  { path: "/dsr", changefreq: "yearly", priority: "0.3" },
];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
