import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Signal } from "lucide-react";
import { Link } from "react-router-dom";

interface TagCardProps {
  id: string;
  name: string;
  accessoryId: string;
  status: 'active' | 'inactive' | 'lost';
  lastLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

export function TagCard({ id, name, accessoryId, status, lastLocation }: TagCardProps) {
  const statusColors = {
    active: "bg-accent text-accent-foreground",
    inactive: "bg-muted text-muted-foreground",
    lost: "bg-destructive text-destructive-foreground"
  };

  return (
    <Link to={`/tag/${id}`}>
      <Card className="hover:shadow-glow transition-all duration-300 cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {name}
            </CardTitle>
            <Badge className={statusColors[status]}>
              {status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{accessoryId}</p>
        </CardHeader>
        <CardContent>
          {lastLocation ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  {lastLocation.latitude.toFixed(6)}, {lastLocation.longitude.toFixed(6)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {new Date(lastLocation.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Signal className="h-4 w-4" />
              <span>Sem localização registrada</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
