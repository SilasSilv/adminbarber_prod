import { ReactNode } from "react";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  showNav?: boolean;
}

export function PageLayout({ children, title, showNav = true }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header title={title} />
      <main className="pb-24">
        {children}
      </main>
      {showNav && <MobileNav />}
    </div>
  );
}
