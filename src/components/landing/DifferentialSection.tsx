import { Zap, ThumbsUp, Flag, TrendingUp } from "lucide-react";

const differentials = [
  { icon: Zap, label: "Sistema moderno e rápido" },
  { icon: ThumbsUp, label: "Fácil de usar, sem treinamento" },
  { icon: Flag, label: "Feito para barbearias brasileiras" },
  { icon: TrendingUp, label: "Escalável para múltiplas unidades" },
];

export function DifferentialSection() {
  return (
    <section className="py-20 lg:py-28 bg-secondary/30">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Mais organização. Mais profissionalismo.{" "}
              <span className="text-gradient">Mais lucro.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              O AdminBarber foi criado para que donos de barbearia foquem no que importa: atender bem e crescer.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {differentials.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-5 rounded-xl bg-card/60 border border-border/50 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <d.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-foreground font-medium">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
