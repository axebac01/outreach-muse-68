import { Helmet } from "react-helmet-async";

const SITE = "https://maillead.ai";

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

export const SeoHead = ({
  title,
  description,
  path,
  ogType = "website",
  jsonLd,
  noindex,
}: SeoHeadProps) => {
  const url = `${SITE}${path}`;
  const lds = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <html lang="sv-SE" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <link rel="alternate" hrefLang="sv-SE" href={url} />
      <link rel="alternate" hrefLang="x-default" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta property="og:locale" content="sv_SE" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {lds.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
};

export default SeoHead;
