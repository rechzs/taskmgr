import {
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <main className="relative isolate flex min-h-svh overflow-hidden bg-background text-foreground">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="grid-pattern absolute inset-0 -z-10" aria-hidden="true" />

      <div className="mx-auto flex w-full max-w-7xl flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3" aria-label="Taskmgr">
            <div className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <span className="font-heading text-sm font-extrabold tracking-[-0.08em]">tm</span>
            </div>
            <span className="font-heading text-sm font-bold tracking-[-0.025em]">taskmgr</span>
          </div>
          <ThemeToggle />
        </header>

        <section className="flex flex-1 items-center py-16 sm:py-20">
          <div className="grid w-full items-end gap-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20">
            <div className="max-w-4xl">
              <Badge variant="outline" className="mb-7 gap-2 rounded-full bg-background/60 px-3 py-1.5 shadow-sm backdrop-blur-xl">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                Em construção
              </Badge>

              <p className="mb-4 font-heading text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground sm:text-base">
                Organização sem atrito
              </p>
              <h1 className="font-heading text-[clamp(4rem,13vw,9.5rem)] font-black leading-[0.82] tracking-[-0.075em]">
                Em
                <br />
                <span className="text-muted-foreground/45">breve.</span>
              </h1>
              <p className="mt-8 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Estamos preparando um jeito mais claro, calmo e inteligente de transformar planos em trabalho concluído.
              </p>
            </div>

            <Card className="status-card border-border/70 bg-card/65 shadow-2xl shadow-foreground/[0.04] backdrop-blur-2xl">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                    <p className="mt-1 font-heading text-xl font-bold tracking-tight">Preparando tudo</p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
                    <HugeiconsIcon icon={SparklesIcon} size={19} strokeWidth={1.8} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4 py-5">
                  <StatusItem label="Experiência" value="Refinando" />
                  <StatusItem label="Fluxos" value="Simplificando" />
                  <StatusItem label="Lançamento" value="Em breve" />
                </div>

                <div className="flex items-center justify-between rounded-xl border bg-background/70 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} className="text-emerald-500" />
                    Sistemas operacionais
                  </span>
                  <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} className="text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-border/60 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Taskmgr</span>
          <span>Feito para deixar o trabalho mais leve.</span>
        </footer>
      </div>
    </main>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
