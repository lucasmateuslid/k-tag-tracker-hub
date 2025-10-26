import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TagCard } from "@/components/TagCard";
import { TagForm } from "@/components/TagForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, MapPin, Tags, Car, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    linked: 0,
    unlinked: 0,
  });

  
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tags")
        .select(`
          *,
          location_history (
            latitude,
            longitude,
            timestamp
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get the latest location for each tag
      const tagsWithLastLocation = data?.map(tag => ({
        ...tag,
        lastLocation: tag.location_history?.[0]
      })) || [];

      setTags(tagsWithLastLocation);

      // Calculate stats
      const total = tagsWithLastLocation.length;
      const active = tagsWithLastLocation.filter(t => t.status === 'active').length;
      const inactive = total - active;
      const linked = tagsWithLastLocation.filter(t => t.vehicle_type && t.license_plate).length;
      const unlinked = total - linked;
      setStats({ total, active, inactive, linked, unlinked });

    } catch (error) {
      console.error("Error fetching tags:", error);
      toast.error("Erro ao carregar tags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tags-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tags'
        },
        () => {
          console.log('Tags updated, refetching...');
          fetchTags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Gerenciamento de Tags
            </h1>
            <p className="text-muted-foreground mt-2">
              Sistema de rastreamento e gerenciamento de dispositivos
            </p>
          </div>
          <TagForm onSuccess={fetchTags} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="shadow-card border-border/50 hover:border-primary/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
              <Tags className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Tags cadastradas</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/50 hover:border-green-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ativas
              </CardTitle>
              <Activity className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.active}</div>
              <p className="text-xs text-muted-foreground mt-1">Em funcionamento</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/50 hover:border-orange-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inativas
              </CardTitle>
              <MapPin className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{stats.inactive}</div>
              <p className="text-xs text-muted-foreground mt-1">Desligadas</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/50 hover:border-blue-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vinculadas
              </CardTitle>
              <Car className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{stats.linked}</div>
              <p className="text-xs text-muted-foreground mt-1">Com veículo</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/50 hover:border-yellow-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Não Vinculadas
              </CardTitle>
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">{stats.unlinked}</div>
              <p className="text-xs text-muted-foreground mt-1">Sem veículo</p>
            </CardContent>
          </Card>
        </div>

        {/* Tags Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando tags...
          </div>
        ) : tags.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Tags className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma tag cadastrada</h3>
              <p className="text-muted-foreground mb-6">
                Comece adicionando sua primeira tag K-Tag
              </p>
              <TagForm onSuccess={fetchTags} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tags.map((tag) => (
              <TagCard
                key={tag.id}
                id={tag.id}
                name={tag.name}
                accessoryId={tag.accessory_id}
                status={tag.status}
                vehicleType={tag.vehicle_type}
                licensePlate={tag.license_plate}
                lastLocation={tag.lastLocation}
                onUpdate={fetchTags}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
