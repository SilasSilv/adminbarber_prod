import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface BarbershopInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface BarbershopContextType {
  barbershop: BarbershopInfo | null;
  isOwner: boolean;
  loading: boolean;
  bookingUrl: string;
  updateBarbershop: (info: Partial<{ name: string; logo_url: string | null }>) => Promise<void>;
  refetch: () => Promise<void>;
}

const BarbershopContext = createContext<BarbershopContextType | undefined>(undefined);

export function BarbershopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [barbershop, setBarbershop] = useState<BarbershopInfo | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchBarbershop = async () => {
    if (!user) {
      setBarbershop(null);
      setIsOwner(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Tenta como dono (admin)
      const { data: ownerData, error: ownerError } = await supabase
        .from("barbershops")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (ownerError) {
        console.error("BarbershopContext: Erro ao buscar como dono:", ownerError);
      }

      if (ownerData) {
        setBarbershop({
          id: ownerData.id,
          name: ownerData.name,
          slug: ownerData.slug,
          logoUrl: ownerData.logo_url,
        });
        setIsOwner(true);
        return;
      }

      // 2. Tenta como profissional vinculado
      const { data: professionalData, error: professionalError } = await supabase
        .from("professionals")
        .select("barbershop_id, barbershops(*)")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (professionalError) {
        console.error("BarbershopContext: Erro ao buscar como profissional:", professionalError);
        setBarbershop(null);
        setIsOwner(false);
        return;
      }

      if (professionalData?.barbershops) {
        const b = professionalData.barbershops as any;
        setBarbershop({
          id: b.id,
          name: b.name,
          slug: b.slug,
          logoUrl: b.logo_url,
        });
        setIsOwner(false);
        return;
      }

      // 3. Nenhum vínculo encontrado
      setBarbershop(null);
      setIsOwner(false);

    } catch (err) {
      console.error("BarbershopContext: Erro inesperado:", err);
      setBarbershop(null);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarbershop();
  }, [user]);

  const bookingUrl = useMemo(
    () => (barbershop ? `${window.location.origin}/agendar/${barbershop.slug}` : ""),
    [barbershop]
  );

  const updateBarbershop = async (info: Partial<{ name: string; logo_url: string | null }>) => {
    if (!barbershop) return;
    const updates: Record<string, unknown> = { ...info };
    if (info.name) {
      updates.slug = info.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
    await supabase.from("barbershops").update(updates).eq("id", barbershop.id);
  };

  return (
    <BarbershopContext.Provider
      value={{ barbershop, isOwner, loading, bookingUrl, updateBarbershop, refetch: fetchBarbershop }}
    >
      {children}
    </BarbershopContext.Provider>
  );
}

export function useBarbershop() {
  const context = useContext(BarbershopContext);
  if (!context) throw new Error("useBarbershop must be used within BarbershopContext");
  return context;
}