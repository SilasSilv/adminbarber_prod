import { Bell, Menu, LogOut, UserCircle, BarChart3, Settings, Scissors, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { useBarbershop } from "@/context/BarbershopContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  title: string;
  showMenu?: boolean;
}

export function Header({ title, showMenu = true }: HeaderProps) {
  const { barbershop, bookingUrl } = useBarbershop();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleCopyLink = () => {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl);
      toast({ title: "Link copiado! 📋" });
    }
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-primary/30">
            <AvatarImage src={barbershop?.logoUrl || undefined} alt="Logo" />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              <Scissors className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={handleCopyLink}
            title="Copiar link de agendamento"
          >
            <Copy className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon-sm" className="relative">
            <Bell className="h-5 w-5" />
          </Button>

          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 glass">
                <DropdownMenuItem asChild>
                  <Link to="/barbeiros" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Profissionais
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/relatorios" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Relatórios
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}