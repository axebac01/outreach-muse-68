import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, Zap, Target, BarChart3, Users, Clock, Upload, Sparkles, Send } from "lucide-react";
import logo from "@/assets/logo.svg";
import { useTranslation } from "react-i18next";
import { PipelineMockup } from "@/components/ui/pipeline-mockup";

const Landing = () => {
  const { t } = useTranslation();

  const features = [
    { icon: Zap, title: t("landing.f1Title"), description: t("landing.f1Desc") },
    { icon: Target, title: t("landing.f2Title"), description: t("landing.f2Desc") },
    { icon: Clock, title: t("landing.f3Title"), description: t("landing.f3Desc") },
    { icon: Users, title: t("landing.f4Title"), description: t("landing.f4Desc") },
    { icon: BarChart3, title: t("landing.f5Title"), description: t("landing.f5Desc") },
    { icon: Mail, title: t("landing.f6Title"), description: t("landing.f6Desc") },
  ];




  const howItWorks = [
    { step: "1", icon: Upload, title: t("landing.step1Title"), description: t("landing.step1Desc") },
    { step: "2", icon: Sparkles, title: t("landing.step2Title"), description: t("landing.step2Desc") },
    { step: "3", icon: Send, title: t("landing.step3Title"), description: t("landing.step3Desc") },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground animate-fade-in">
              <Zap className="h-3.5 w-3.5" />
              {t("landing.badge")}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-7xl leading-[1.05] animate-fade-in">
              <span className="text-primary">{t("landing.heroHighlight")}</span> {t("landing.heroRest")}
            </h1>
            <p className="mx-auto max-w-xl text-lg md:text-xl text-muted-foreground leading-relaxed animate-fade-in">
              {t("landing.heroSub")}
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-fade-in">
              <Button variant="hero" size="lg" asChild>
                <Link to="/signup" className="gap-2">
                  {t("landing.ctaPrimary")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/pricing">{t("landing.ctaSecondary")}</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground animate-fade-in">{t("landing.noCard")}</p>
          </div>

          <div className="mx-auto mt-12 w-full max-w-[880px]">
            <PipelineMockup />
          </div>
        </div>
      </section>


      {/* How it works */}
      <section className="py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t("landing.howTitle")}</h2>
            <p className="text-lg text-muted-foreground">{t("landing.howSub")}</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
            {howItWorks.map((step) => (
              <div key={step.step} className="text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {step.step}
                </div>
                <h3 className="font-semibold text-base">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-t">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t("landing.featuresTitle")}</h2>
            <p className="text-lg text-muted-foreground">{t("landing.featuresSub")}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border bg-card p-7 space-y-4 hover:shadow-md hover:border-primary/20 hover:-translate-y-1 transition-all duration-200">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="container py-24">
        <div className="mx-auto max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold">{t("landing.ctaTitle")}</h2>
          <p className="text-lg text-muted-foreground">{t("landing.ctaSub")}</p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/signup" className="gap-2">
              {t("landing.ctaPrimary")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur p-3 sm:hidden z-50">
        <Button className="w-full" size="lg" asChild>
          <Link to="/signup">{t("landing.mobileCta")}</Link>
        </Button>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center text-sm text-muted-foreground">
            <img src={logo} alt="MailLead" className="h-7 w-auto" />
          </div>
          <p className="text-xs text-muted-foreground">{t("landing.footer")}</p>
        </div>
      </footer>
    </Layout>
  );
};

export default Landing;
