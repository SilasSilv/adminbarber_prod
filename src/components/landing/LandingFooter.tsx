export function LandingFooter() {
  return (
    <footer className="py-8 border-t border-border/50">
      <div className="container text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} AdminBarber. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
