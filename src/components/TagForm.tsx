import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function TagForm({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    accessoryId: "",
    hashedAdvKey: "",
    privateKey: "",
    vehicleType: "",
    licensePlate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para criar tags");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("tags").insert({
        user_id: user.id,
        name: formData.name,
        accessory_id: formData.accessoryId,
        hashed_adv_key: formData.hashedAdvKey,
        private_key: formData.privateKey,
        vehicle_type: formData.vehicleType || null,
        license_plate: formData.licensePlate || null,
        status: 'active'
      });

      if (error) throw error;

      toast.success("Tag cadastrada com sucesso!");
      setFormData({ 
        name: "", 
        accessoryId: "", 
        hashedAdvKey: "", 
        privateKey: "",
        vehicleType: "",
        licensePlate: ""
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Erro ao cadastrar tag");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="mr-2 h-4 w-4" />
          Nova Tag
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Tag K-Tag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Tag</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Rastreador Principal"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleType">Tipo de Veículo</Label>
              <Select
                value={formData.vehicleType}
                onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
              >
                <SelectTrigger id="vehicleType">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="caminhao">Caminhão</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="onibus">Ônibus</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="licensePlate">Placa do Veículo</Label>
              <Input
                id="licensePlate"
                value={formData.licensePlate}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                placeholder="ABC-1234"
                maxLength={8}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessoryId">Accessory ID</Label>
            <Input
              id="accessoryId"
              value={formData.accessoryId}
              onChange={(e) => setFormData({ ...formData, accessoryId: e.target.value })}
              placeholder="Ex: ABC123DEF456"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hashedAdvKey">Hashed Advertising Key</Label>
            <Input
              id="hashedAdvKey"
              value={formData.hashedAdvKey}
              onChange={(e) => setFormData({ ...formData, hashedAdvKey: e.target.value })}
              placeholder="Chave hasheada"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="privateKey">Private Key</Label>
            <Input
              id="privateKey"
              type="password"
              value={formData.privateKey}
              onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
              placeholder="Chave privada"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary hover:opacity-90 transition-opacity">
              {loading ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
