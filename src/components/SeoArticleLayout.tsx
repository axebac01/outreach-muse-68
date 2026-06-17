import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { SOFT_LAUNCH_MODE, WAITLIST_PATH } from "@/config/launch";

interface SeoArticleLayoutProps {
  title: string;
  description: string;
  path: string;
  heading: ReactNode;
  intro: ReactNode;
  sections: { h2: string; body: ReactNode }[];
  faqs: { q: string; a: string }[];
  related: { to: string; label: string }[];
  ctaText?: string;
}

const SeoArticleLayout = ({
  title,
  description,
  path,
  heading,
  intro,
  sections,
  faqs,
  related,
  ctaText = "Säkra din plats inför launch",
}: SeoArticleLayoutProps) => {
  const ctaHref = SOFT_LAUNCH_MODE ? WAITLIST_PATH : "/signup";

  return (
    <Layout>
      <SeoHead
        title={title}
        description={description}
        path={path}
        ogType="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: title,
            description,
            inLanguage: "sv-SE",
            author: { "@type": "Organization", name: "MailLead" },
            publisher: { "@type": "Organization", name: "MailLead" },
            mainEntityOfPage: `https://maillead.ai${path}`,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(({ q, a }) => ({
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
              { "@type": "ListItem", position: 2, name: title, item: `https://maillead.ai${path}` },
            ],
          },
        ]}
      />

      <article className="container max-w-3xl py-12 md:py-16">
        <nav aria-label="Brödsmulor" className="text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Start</Link>
          <span className="mx-2">/</span>
          <span>Guide</span>
        </nav>

        <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
          {heading}
        </h1>
        <div className="mt-5 text-lg text-muted-foreground leading-relaxed">{intro}</div>

        <div className="mt-10 space-y-10">
          {sections.map((s) => (
            <section key={s.h2}>
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-3">{s.h2}</h2>
              <div className="text-base text-foreground/90 leading-relaxed space-y-3">{s.body}</div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-border/60 bg-card/60 p-6 md:p-8 backdrop-blur">
          <h3 className="font-display text-xl md:text-2xl font-bold tracking-tight">
            Vill du testa MailLead.ai?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Vi öppnar 15 augusti 2026. Säkra din plats nu — tidiga användare får 50 extra gratis-credits vid launch.
          </p>
          <Button asChild className="mt-4 gap-2">
            <Link to={ctaHref}>
              {ctaText} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-4">Vanliga frågor</h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
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

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-xl font-bold tracking-tight mb-3">Läs vidare</h2>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.to}>
                  <Link to={r.to} className="text-primary hover:underline inline-flex items-center gap-1">
                    {r.label} <ArrowRight className="h-3.5 w-3.5" />
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

export default SeoArticleLayout;
