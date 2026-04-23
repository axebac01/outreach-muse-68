import { useEffect } from "react";
import { useNavigate, useParams, Outlet, NavLink, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { useSequence, useUpdateSequence, useCreateSequence } from "@/hooks/useSequence";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "leads", path: "leads" },
  { key: "sequence", path: "sequence" },
  { key: "schedule", path: "schedule" },
  { key: "sending", path: "sending" },
] as const;

const SequenceBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { data: sequence, isLoading } = useSequence(id);
  const updateSeq = useUpdateSequence(id ?? "");
  const createSeq = useCreateSequence();

  // /sequence/new → create + redirect
  useEffect(() => {
    if (id === "new") {
      createSeq.mutateAsync(undefined).then((s) => {
        navigate(`/sequence/${s.id}/leads`, { replace: true });
      });
    }
  }, [id]);

  if (id === "new" || isLoading || !sequence) {
    return (
      <Layout>
        <div className="container py-12 text-muted-foreground">{t("common.loading")}</div>
      </Layout>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => location.pathname.endsWith(`/${s.path}`));

  return (
    <Layout>
      <div className="border-b sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container py-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Input
                value={sequence.name}
                onChange={(e) => updateSeq.mutate({ name: e.target.value })}
                className="text-lg font-semibold border-none shadow-none px-2 focus-visible:ring-1"
              />
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">
              {t("sequence.savedAs", { status: sequence.status })}
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s, i) => {
              const active = i === currentStepIndex;
              const completed = i < currentStepIndex;
              return (
                <NavLink
                  key={s.key}
                  to={`/sequence/${id}/${s.path}`}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
                    active && "bg-primary/10 text-primary font-medium",
                    !active && "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center text-xs",
                      active && "bg-primary text-primary-foreground",
                      completed && "bg-success/20 text-success",
                      !active && !completed && "bg-muted",
                    )}
                  >
                    {completed ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  {t(`sequence.steps.${s.key}`)}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="container py-8">
        <Outlet context={{ sequence }} />
      </div>
    </Layout>
  );
};

export default SequenceBuilder;
