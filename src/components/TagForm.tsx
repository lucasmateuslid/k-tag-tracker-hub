import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    privateKey: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("tags").insert({
        name: formData.name,
        accessory_id: formData.accessoryId,
        hashed_adv_key: formData.hashedAdvKey,
        private_key: formData.privateKey,
        status: 'active'
      });

      if (error) throw error;

      toast.success("Tag cadastrada com sucesso!");
      setFormData({ name: "", accessoryId: "", hashedAdvKey: "", privateKey: "" });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error("Erro ao cadastrar tag");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" />
          Nova Tag
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
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
              placeholder="Ex: Mochila Principal"
              required
            />
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
            <Button type="submit" disabled={loading} className="bg-gradient-primary">
              {loading ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
