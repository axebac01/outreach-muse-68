import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import SeoHead from "@/components/SeoHead";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SeoHead
        title="404 – Sidan hittades inte | MailLead.ai"
        description="Sidan du letar efter finns inte. Gå tillbaka till startsidan för MailLead.ai."
        path={location.pathname}
        noindex
      />
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">{t("notFound.title")}</h1>
          <p className="mb-4 text-xl text-muted-foreground">{t("notFound.message")}</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            {t("notFound.home")}
          </a>
        </div>
      </div>
    </>
  );
};

export default NotFound;
