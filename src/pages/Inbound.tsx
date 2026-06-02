import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radar, Building2, Target, Bell, Sparkles } from "lucide-react";
import { toast } from "sonner";

const features = [
  {
    icon: Building2,
    title: "Företagsidentifiering",
    desc: "Identifiera B2B-besökare via IP och berika med bransch, storlek och kontaktytor.",
  },
  {
    icon: Target,
    title: "Lead-matchning",
    desc: "Få notiser när dina befintliga leads återbesöker sajten — följ upp i rätt ögonblick.",
  },
  {
    icon: Sparkles,
    title: "Smart prioritering",
    desc: "Se vilka sidor besökaren tittat på och hur het signalen är, så du vet vem du ska kontakta först.",
  },
];

const Inbound = () => {
  return (
    <Layout>
      <div className="container max-w-4xl py-16">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Beta · Under utveckling
            </Badge>
          </div>

          <div className="relative inline-flex mx-auto">
            <div className="absolute inset-0 -m-8 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <div className="relative rounded-2xl border bg-card p-6 shadow-lg">
              <Radar className="h-12 w-12 text-primary" strokeWidth={1.5} />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight">
              Inbound — kommer snart
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Se vilka företag som besöker din hemsida — även om de aldrig
              fyller i ett formulär. Förvandla anonym trafik till varma leads.
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-2">
            <Button
              onClick={() =>
                toast.success("Tack!", {
                  description: "Vi hör av oss så snart Inbound släpps.",
                })
              }
              className="gap-2"
            >
              <Bell className="h-4 w-4" /> Notifiera mig vid lansering
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-16">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-5 space-y-3 hover:border-primary/40 transition-colors"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-xl border border-dashed bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Vi bygger Inbound just nu. Under tiden kan du fokusera på dina
            kampanjer och Unibox — där svaren landar.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Inbound;
