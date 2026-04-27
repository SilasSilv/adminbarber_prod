import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">✂</span>
          </div>
          <span className="font-bold text-lg">AdminBarber</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Entrar</Link>
          </Button>
          <Button variant="gold" size="sm" asChild>
            <Link to="/register">Teste Grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
