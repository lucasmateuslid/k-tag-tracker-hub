import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save } from "lucide-react";

type MapProvider = "mapbox" | "google" | "openstreetmap";

type MapSettings = {
  provider: MapProvider;
  mapboxKey: string;
  googleKey: string;
};

const DEFAULT_SETTINGS: MapSettings = {
  provider: "openstreetmap",
  mapboxKey: import.meta.env.VITE_MAPBOX_API_KEY || "",
  googleKey: "",
};

export default function Settings() {
  const [settings, setSettings] = useState<MapSettings>(() => {
    const saved = localStorage.getItem("mapSettings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const handleSave = () => {
    localStorage.setItem("mapSettings", JSON.stringify(settings));
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-8">
        Configurações
      </h1>

      <div className="max-w-2xl space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Provedor de Mapas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provedor Padrão</Label>
              <Select
                value={settings.provider}
                onValueChange={(value: MapProvider) =>
                  setSettings({ ...settings, provider: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mapbox">Mapbox</SelectItem>
                  <SelectItem value="google">Google Maps</SelectItem>
                  <SelectItem value="openstreetmap">OpenStreetMap</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mapbox-key">Mapbox API Key</Label>
              <Input
                id="mapbox-key"
                type="text"
                value={settings.mapboxKey}
                onChange={(e) =>
                  setSettings({ ...settings, mapboxKey: e.target.value })
                }
                placeholder="pk.eyJ1Ijoi..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-key">Google Maps API Key</Label>
              <Input
                id="google-key"
                type="text"
                value={settings.googleKey}
                onChange={(e) =>
                  setSettings({ ...settings, googleKey: e.target.value })
                }
                placeholder="AIzaSy..."
              />
            </div>

            <p className="text-sm text-muted-foreground">
              OpenStreetMap não requer API Key
            </p>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full bg-gradient-primary">
          <Save className="mr-2 h-4 w-4" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
