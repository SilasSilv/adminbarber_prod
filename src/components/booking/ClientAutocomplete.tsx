import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ClientAutocompleteProps {
  barbershopId: string;
  onSelect: (clientId: string, name: string, phone: string) => void;
}

export function ClientAutocomplete({ barbershopId, onSelect }: ClientAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredClients, setFilteredClients] = useState<{ id: string; name: string; whatsapp: string }[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch clients whenever barbershopId or searchQuery changes
  useEffect(() => {
    if (!barbershopId) return;
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, whatsapp")
        .eq("barbershop_id", barbershopId)
        .textSearch("name", searchQuery)
        .or(`whatsapp.ilike.${searchQuery}`)
        .order("created_at", { ascending: false });
      if (!error) setFilteredClients(data || []);
    };
    fetchClients();
  }, [barbershopId, searchQuery]);

  const handleCreateNew = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    setIsCreating(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({
        barbershop_id: barbershopId,
        name: newName.trim(),
        whatsapp: newPhone.trim(),
        active: true,
      })
      .select("id, name, whatsapp")
      .single();

    if (!error) {
      onSelect(data.id, data.name, data.whatsapp);
    }
    setIsCreating(false);
    setNewName("");
    setNewPhone("");
  };

  return (
    <div className="space-y-2">
      <Label>Cliente</Label>
      <Input
        placeholder="Buscar cliente..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 h-12 bg-secondary"
      />

      {/* Show matching clients */}
      {searchQuery && filteredClients.length > 0 && (
        <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 bg-secondary">
          {filteredClients.map((c) => (
            <Button
              key={c.id}
              variant="ghost"
              className="text-sm w-full"
              onClick={() => onSelect(c.id, c.name, c.whatsapp)}
            >
              {c.name} ({c.whatsapp})
            </Button>
          ))}
        </div>
      )}

      {/* Create new client form */}
      {isCreating ? (
        <div className="space-y-2">
          <Input
            placeholder="Nome"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-10 bg-secondary"
          />
          <Input
            placeholder="Telefone"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="h-10 bg-secondary"
          />
          <Button variant="gold" onClick={handleCreateNew} disabled={!newName.trim() || !newPhone.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Criar"}
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setIsCreating(true)} className="w-full text-sm">
          { "Cadastrar novo cliente" }
        </Button>
      )}
    </div>
  );
}