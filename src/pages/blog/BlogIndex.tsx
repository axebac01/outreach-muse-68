import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import SeoHead from "@/components/SeoHead";
import { BLOG_POSTS } from "@/data/blogPosts";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const BlogIndex = () => {
  const posts = [...BLOG_POSTS].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  return (
    <Layout>
      <SeoHead
        title="MailLead-bloggen — outbound, cold email & B2B-sälj i Sverige"
        description="Guider, trender och praktiska tips för svenska B2B-säljare. Allt om cold email, outbound, leadgenerering och GDPR — från MailLead.ai."
        path="/blogg"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "MailLead-bloggen",
            url: "https://maillead.ai/blogg",
            inLanguage: "sv-SE",
            publisher: { "@type": "Organization", name: "MailLead" },
            blogPost: posts.map((p) => ({
              "@type": "BlogPosting",
              headline: p.title,
              url: `https://maillead.ai/blogg/${p.slug}`,
              datePublished: p.publishedAt,
              description: p.description,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Start", item: "https://maillead.ai/" },
              { "@type": "ListItem", position: 2, name: "Blogg", item: "https://maillead.ai/blogg" },
            ],
          },
        ]}
      />

      <div className="container max-w-4xl py-12 md:py-16">
        <nav aria-label="Brödsmulor" className="text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Start</Link>
          <span className="mx-2">/</span>
          <span>Blogg</span>
        </nav>

        <header className="mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
            MailLead-bloggen
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            Guider, trender och praktiska tips för svenska B2B-säljare —
            från oss på MailLead.ai.
          </p>
        </header>

        <div className="space-y-6">
          {posts.map((p) => (
            <article
              key={p.slug}
              className="group rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8 backdrop-blur transition hover:border-border"
            >
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(p.publishedAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {p.readingMinutes} min läsning
                </span>
              </div>
              <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                <Link to={`/blogg/${p.slug}`} className="hover:text-primary">
                  {p.title}
                </Link>
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                {p.excerpt}
              </p>
              <Link
                to={`/blogg/${p.slug}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Läs hela artikeln <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default BlogIndex;
