import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapboxMap } from "@/components/maps/MapboxMap";
import { GoogleMap } from "@/components/maps/GoogleMap";
import { LeafletMap } from "@/components/maps/LeafletMap";
import { ArrowLeft, MapPin, Clock, Signal, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type MapProvider = "mapbox" | "google" | "openstreetmap";

export default function TagDetails() {
  const { id } = useParams();
  const [tag, setTag] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
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

  const fetchTag = async () => {
    if (!id) return;

    try {
      const { data: tagData, error: tagError } = await supabase
        .from("tags")
        .select("*")
        .eq("id", id)
        .single();

      if (tagError) throw tagError;
      setTag(tagData);

      // Fetch latest location
      const { data: locationData } = await supabase
        .from("location_history")
        .select("*")
        .eq("tag_id", id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      if (locationData) {
        setLocation(locationData);
      }
    } catch (error) {
      console.error("Error fetching tag:", error);
      toast.error("Erro ao carregar dados da tag");
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    if (!id) return;

    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("query-ktag", {
        body: { tagId: id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      if (data.success && data.location) {
        toast.success("Localização atualizada!");
        fetchTag();
      } else {
        toast.error("Não foi possível obter a localização");
      }
    } catch (error) {
      console.error("Error updating location:", error);
      toast.error("Erro ao atualizar localização");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchTag();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('location-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_history',
          filter: `tag_id=eq.${id}`
        },
        (payload) => {
          console.log('New location received:', payload);
          setLocation(payload.new);
          toast.success("Nova localização recebida!");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Tag não encontrada</h2>
          <Link to="/">
            <Button>Voltar ao Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusColors = {
    active: "bg-accent text-accent-foreground",
    inactive: "bg-muted text-muted-foreground",
    lost: "bg-destructive text-destructive-foreground"
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {tag.name}
              </h1>
              <p className="text-muted-foreground mt-2">ID: {tag.accessory_id}</p>
            </div>
            <div className="flex gap-3 items-center">
              <Badge className={statusColors[tag.status as keyof typeof statusColors]}>
                {tag.status}
              </Badge>
              <Button
                onClick={updateLocation}
                disabled={updating}
                className="bg-gradient-primary"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                {updating ? 'Atualizando...' : 'Atualizar Agora'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location Info */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Última Localização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {location ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Latitude:</span>
                      <span className="font-mono">{location.latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Longitude:</span>
                      <span className="font-mono">{location.longitude.toFixed(6)}</span>
                    </div>
                    {location.confidence && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Confiança:</span>
                        <Badge variant="outline">{location.confidence}%</Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm pt-2 border-t">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {new Date(location.timestamp).toLocaleString('pt-BR', {
                          timeZone: 'America/Fortaleza'
                        })}
                      </span>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir no Google Maps
                    </Button>
                  </a>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Signal className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma localização registrada</p>
                  <p className="text-sm mt-2">Clique em "Atualizar Agora" para consultar</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tag Info */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Informações da Tag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nome:</span>
                <span className="font-semibold">{tag.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Accessory ID:</span>
                <span className="font-mono text-sm">{tag.accessory_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge className={statusColors[tag.status as keyof typeof statusColors]}>
                  {tag.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-muted-foreground">Cadastrado em:</span>
                <span className="text-sm">
                  {new Date(tag.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        {location && (
          <Card className="shadow-card mt-6">
            <CardHeader>
              <CardTitle>Localização no Mapa</CardTitle>
            </CardHeader>
            <CardContent>
              {provider === "mapbox" && (
                <MapboxMap
                  latitude={location.latitude}
                  longitude={location.longitude}
                  markerTitle={tag.name}
                  apiKey={apiKeys.mapbox}
                />
              )}
              {provider === "google" && (
                <GoogleMap
                  latitude={location.latitude}
                  longitude={location.longitude}
                  markerTitle={tag.name}
                  apiKey={apiKeys.google}
                />
              )}
              {provider === "openstreetmap" && (
                <LeafletMap
                  latitude={location.latitude}
                  longitude={location.longitude}
                  markerTitle={tag.name}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
