import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
      <div className="container relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Pronto para{" "}
            <span className="text-gradient">profissionalizar</span> sua barbearia?
          </h2>
          <p className="text-muted-foreground text-lg">
            Comece agora mesmo, sem cartão de crédito. Configure em minutos.
          </p>
          <Button size="xl" variant="gold" className="group text-lg px-12">
            Criar Conta Gratuitamente
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
}
