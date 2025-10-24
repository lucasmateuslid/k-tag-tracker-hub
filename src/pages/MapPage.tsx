import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapboxMap } from "@/components/maps/MapboxMap";
import { GoogleMap } from "@/components/maps/GoogleMap";
import { LeafletMap } from "@/components/maps/LeafletMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

type MapProvider = "mapbox" | "google" | "openstreetmap";

export default function MapPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [location, setLocation] = useState<any>(null);
  const [provider, setProvider] = useState<MapProvider>("mapbox");
  const [apiKeys, setApiKeys] = useState({ mapbox: "", google: "" });

  useEffect(() => {
    const saved = localStorage.getItem("mapSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      setProvider(settings.provider || "mapbox");
      setApiKeys({
        mapbox: settings.mapboxKey || "",
        google: settings.googleKey || "",
      });
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (selectedTag) {
      fetchLocation(selectedTag);
    }
  }, [selectedTag]);

  const fetchTags = async () => {
    const { data } = await supabase.from("tags").select("*").order("name");
    if (data) {
      setTags(data);
      if (data.length > 0 && !selectedTag) {
        setSelectedTag(data[0].id);
      }
    }
  };

  const fetchLocation = async (tagId: string) => {
    const { data } = await supabase
      .from("location_history")
      .select("*")
      .eq("tag_id", tagId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    setLocation(data);
  };

  const renderMap = () => {
    if (!location) {
      return (
        <div className="w-full h-[400px] rounded-lg bg-muted flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Selecione uma tag com localização</p>
          </div>
        </div>
      );
    }

    const props = {
      latitude: location.latitude,
      longitude: location.longitude,
      markerTitle: tags.find((t) => t.id === selectedTag)?.name,
    };

    switch (provider) {
      case "mapbox":
        return <MapboxMap {...props} apiKey={apiKeys.mapbox} />;
      case "google":
        return <GoogleMap {...props} apiKey={apiKeys.google} />;
      case "openstreetmap":
        return <LeafletMap {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-8">
        Visualização no Mapa
      </h1>

      <div className="grid gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Selecionar Tag e Provedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tag</label>
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Provedor de Mapa</label>
                <Select
                  value={provider}
                  onValueChange={(v: MapProvider) => setProvider(v)}
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
            </div>

            {location && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Badge variant="outline">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(location.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">{renderMap()}</CardContent>
        </Card>
      </div>
    </div>
  );
}
