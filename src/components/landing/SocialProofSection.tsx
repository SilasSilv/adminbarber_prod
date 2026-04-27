import { MessageSquareQuote } from "lucide-react";

export function SocialProofSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageSquareQuote className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold">Prova Social</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Em breve: histórias reais de barbearias que cresceram com o AdminBarber.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-2xl border border-dashed border-border/80 bg-card/30 space-y-3">
                <div className="h-10 w-10 rounded-full bg-muted/50 mx-auto" />
                <div className="h-3 w-24 rounded bg-muted/40 mx-auto" />
                <div className="space-y-1.5">
                  <div className="h-2 w-full rounded bg-muted/30" />
                  <div className="h-2 w-3/4 rounded bg-muted/30 mx-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
