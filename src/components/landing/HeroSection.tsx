import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/50" />
      <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl" />

      <div className="container relative z-10 py-20 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-sm text-primary font-medium">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Sistema #1 para barbearias
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              Organize sua barbearia.{" "}
              <span className="text-gradient">Aumente seu faturamento.</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">
              Agendamentos online, controle financeiro e gestão completa em um único sistema.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="xl" variant="gold" className="group">
                Começar Teste Grátis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button size="xl" variant="outline" className="group">
                <Play className="h-5 w-5" />
                Ver Como Funciona
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Sem cartão de crédito
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Setup em 2 minutos
              </span>
            </div>
          </div>

          {/* Mockup */}
          <div className="relative animate-slide-up hidden lg:block">
            <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10 bg-card">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-secondary/50">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/60" />
                  <div className="h-3 w-3 rounded-full bg-warning/60" />
                  <div className="h-3 w-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-6 rounded-md bg-muted/50 max-w-xs mx-auto px-3 flex items-center text-xs text-muted-foreground">
                    app.adminbarber.com/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-4 w-32 rounded bg-muted/50" />
                    <div className="h-3 w-24 rounded bg-muted/30" />
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-primary/10" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {["R$ 3.250", "48 cortes", "12 hoje"].map((text, i) => (
                    <div key={i} className="rounded-lg bg-secondary/80 p-3 space-y-1">
                      <div className="h-3 w-12 rounded bg-muted/40" />
                      <p className="text-sm font-bold text-foreground">{text}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-28 rounded bg-muted/40" />
                        <div className="h-2 w-20 rounded bg-muted/30" />
                      </div>
                      <div className="h-6 w-16 rounded-full bg-success/20 flex items-center justify-center">
                        <span className="text-[10px] text-success font-medium">Agendado</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Glow */}
            <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
