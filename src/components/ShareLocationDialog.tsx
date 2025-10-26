import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Share2, Copy, Mail } from "lucide-react";

interface ShareLocationDialogProps {
  tagId: string;
  tagName: string;
  latitude?: number;
  longitude?: number;
}

export function ShareLocationDialog({ tagId, tagName, latitude, longitude }: ShareLocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const shareUrl = `${window.location.origin}/tag/${tagId}`;
  const locationUrl = latitude && longitude 
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : shareUrl;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(locationUrl);
    toast.success("Link copiado para a área de transferência!");
  };

  const handleShareByEmail = async () => {
    if (!email) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    setLoading(true);
    
    // Aqui você pode implementar o envio de email usando uma edge function
    // Por enquanto, vamos apenas simular
    setTimeout(() => {
      toast.success("Email enviado com sucesso!");
      setEmail("");
      setLoading(false);
      setOpen(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Compartilhar Localização - {tagName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Link de Compartilhamento</Label>
            <div className="flex gap-2">
              <Input
                value={locationUrl}
                readOnly
                className="bg-muted"
              />
              <Button 
                onClick={handleCopyLink}
                variant="outline"
                size="icon"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-email">Enviar por Email</Label>
            <div className="flex gap-2">
              <Input
                id="share-email"
                type="email"
                placeholder="destinatario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button 
                onClick={handleShareByEmail}
                disabled={loading}
                className="bg-gradient-primary"
              >
                <Mail className="h-4 w-4 mr-2" />
                {loading ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>

          {latitude && longitude && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">Coordenadas:</p>
              <p className="text-muted-foreground">
                Latitude: {latitude.toFixed(6)}<br />
                Longitude: {longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
