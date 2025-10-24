import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TagCard } from "@/components/TagCard";
import { TagForm } from "@/components/TagForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, MapPin, Tags } from "lucide-react";
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
      setStats({ total, active, inactive });

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
              K-Tag Tracker
            </h1>
            <p className="text-muted-foreground mt-2">
              Sistema de rastreamento e gerenciamento de dispositivos
            </p>
          </div>
          <TagForm onSuccess={fetchTags} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Tags
              </CardTitle>
              <Tags className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tags Ativas
              </CardTitle>
              <Activity className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{stats.active}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tags Inativas
              </CardTitle>
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.inactive}</div>
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
                lastLocation={tag.lastLocation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
