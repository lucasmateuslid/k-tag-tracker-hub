import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImprovedMapContainer } from "@/components/maps/ImprovedMapContainer";
import { ShareLocationDialog } from "@/components/ShareLocationDialog";
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
        // Enhanced error messaging
        const message = data.message || "Não foi possível obter a localização";
        const details = data.details;
        
        if (details?.reason === 'no_reports') {
          toast.error(message, {
            description: details.suggestion,
            duration: 6000
          });
        } else if (details?.reason === 'invalid_keys') {
          toast.error("Chaves inválidas", {
            description: details.suggestion,
            duration: 6000
          });
        } else {
          toast.error(message);
        }
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
            <div className="flex gap-3 items-center flex-wrap">
              <Badge className={statusColors[tag.status as keyof typeof statusColors]}>
                {tag.status}
              </Badge>
              <Button
                onClick={updateLocation}
                disabled={updating}
                className="bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                {updating ? 'Atualizando...' : 'Atualizar Agora'}
              </Button>
              {location && (
                <ShareLocationDialog
                  tagId={tag.id}
                  tagName={tag.name}
                  latitude={location.latitude}
                  longitude={location.longitude}
                />
              )}
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
                  <p className="font-semibold">Aguardando primeiro relatório</p>
                  <p className="text-sm mt-2">
                    {(() => {
                      const ageMs = Date.now() - new Date(tag.created_at).getTime();
                      const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
                      
                      if (ageHours < 1) {
                        return 'Tag recém-criada. Pode levar algumas horas para a primeira detecção.';
                      } else if (ageHours < 24) {
                        return `Tag criada há ${ageHours} hora${ageHours > 1 ? 's' : ''}. Continue tentando atualizar periodicamente.`;
                      } else {
                        return 'Verifique se a tag está ativa e em área com dispositivos Apple.';
                      }
                    })()}
                  </p>
                  <Button 
                    onClick={updateLocation} 
                    disabled={updating}
                    variant="outline" 
                    className="mt-4"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                    {updating ? 'Consultando...' : 'Tentar Consultar'}
                  </Button>
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
              {tag.vehicle_type && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tipo de Veículo:</span>
                    <span>{tag.vehicle_type}</span>
                  </div>
                  {tag.license_plate && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Placa:</span>
                      <span className="font-mono">{tag.license_plate}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-muted-foreground">Cadastrado em:</span>
                <span className="text-sm">
                  {new Date(tag.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Idade da Tag:</span>
                <span className="text-sm">
                  {(() => {
                    const ageMs = Date.now() - new Date(tag.created_at).getTime();
                    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
                    const ageDays = Math.floor(ageHours / 24);
                    
                    if (ageDays > 0) {
                      return `${ageDays} dia${ageDays > 1 ? 's' : ''}`;
                    } else if (ageHours > 0) {
                      return `${ageHours} hora${ageHours > 1 ? 's' : ''}`;
                    } else {
                      return 'Menos de 1 hora';
                    }
                  })()}
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
              <ImprovedMapContainer
                latitude={location.latitude}
                longitude={location.longitude}
                markerTitle={tag.name}
                preferredProvider={provider}
                mapboxKey={apiKeys.mapbox}
                googleKey={apiKeys.google}
                zoom={15}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
