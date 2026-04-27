import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { BarbershopProvider } from "@/context/BarbershopContext";
import { AppointmentProvider } from "@/context/AppointmentContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SplashScreen } from "@/components/SplashScreen";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import NewAppointment from "./pages/NewAppointment";
import Clientes from "./pages/Clientes";
import Servicos from "./pages/Servicos";
import Caixa from "./pages/Caixa";
import Barbeiros from "./pages/Barbeiros";
import Relatorios from "./pages/Relatorios";
import Products from "./pages/Products";
import Configuracoes from "./pages/Configuracoes";
import PublicBooking from "./pages/PublicBooking";
import ConfirmacaoAgendamento from "./pages/ConfirmacaoAgendamento";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BarbershopProvider>
            <AppointmentProvider>
              <SplashScreen />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
                <Route path="/agenda/novo" element={<ProtectedRoute><NewAppointment /></ProtectedRoute>} />
                <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
                <Route path="/servicos" element={<ProtectedRoute><Servicos /></ProtectedRoute>} />
                <Route path="/caixa" element={<ProtectedRoute><Caixa /></ProtectedRoute>} />
                <Route path="/barbeiros" element={<ProtectedRoute><Barbeiros /></ProtectedRoute>} />
                <Route path="/produtos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                {/* Public booking routes */}
                <Route path="/confirmacao-agendamento" element={<ConfirmacaoAgendamento />} />
                <Route path="/agendar/:slug" element={<PublicBooking />} />
                <Route path="/:slug" element={<PublicBooking />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppointmentProvider>
          </BarbershopProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;