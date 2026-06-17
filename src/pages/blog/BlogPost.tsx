import { Navigate, useParams, Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { getPostBySlug, BLOG_POSTS } from "@/data/blogPosts";
import { SOFT_LAUNCH_MODE, WAITLIST_PATH } from "@/config/launch";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) return <Navigate to="/blogg" replace />;

  const ctaHref = SOFT_LAUNCH_MODE ? WAITLIST_PATH : "/signup";
  const url = `https://maillead.ai/blogg/${post.slug}`;
  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <Layout>
      <SeoHead
        title={`${post.title} — MailLead-bloggen`}
        description={post.description}
        path={`/blogg/${post.slug}`}
        ogType="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.publishedAt,
            dateModified: post.publishedAt,
            inLanguage: "sv-SE",
            author: { "@type": "Organization", name: "MailLead" },
            publisher: { "@type": "Organization", name: "MailLead", logo: { "@type": "ImageObject", url: "https://maillead.ai/favicon.svg" } },
            mainEntityOfPage: url,
            image: "https://maillead.ai/og-image.jpg",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: post.faqs.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Start", item: "https://maillead.ai/" },
              { "@type": "ListItem", position: 2, name: "Blogg", item: "https://maillead.ai/blogg" },
              { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
          },
        ]}
      />

      <article className="container max-w-3xl py-12 md:py-16">
        <nav aria-label="Brödsmulor" className="text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Start</Link>
          <span className="mx-2">/</span>
          <Link to="/blogg" className="hover:text-foreground">Blogg</Link>
        </nav>

        <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
          {post.heading}
        </h1>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(post.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {post.readingMinutes} min läsning
          </span>
        </div>

        <div className="mt-6 text-lg text-muted-foreground leading-relaxed">{post.intro}</div>

        <div className="mt-10 space-y-10">
          {post.sections.map((s) => (
            <section key={s.h2}>
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-3">
                {s.h2}
              </h2>
              <div className="text-base text-foreground/90 leading-relaxed space-y-3">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border/60 bg-card/60 p-6 md:p-8 backdrop-blur">
          <h3 className="font-display text-xl md:text-2xl font-bold tracking-tight">
            Vill du testa MailLead.ai?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Vi öppnar 15 augusti 2026. Säkra din plats nu — tidiga användare får
            50 extra gratis-credits vid launch.
          </p>
          <Button asChild className="mt-4 gap-2">
            <Link to={ctaHref}>
              Säkra din plats inför launch <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {post.faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Vanliga frågor
            </h2>
            <div className="space-y-4">
              {post.faqs.map(({ q, a }) => (
                <details key={q} className="rounded-xl border border-border/60 bg-card/40 p-4 group">
                  <summary className="cursor-pointer font-semibold list-none flex items-center justify-between gap-3">
                    {q}
                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-xl font-bold tracking-tight mb-3">Fler artiklar</h2>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    to={`/blogg/${r.slug}`}
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {r.title} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </Layout>
  );
};

export default BlogPost;
