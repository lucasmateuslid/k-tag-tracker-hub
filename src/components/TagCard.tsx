import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Signal, Car, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { TagEditDialog } from "./TagEditDialog";
import { ShareLocationDialog } from "./ShareLocationDialog";

interface TagCardProps {
  id: string;
  name: string;
  accessoryId: string;
  status: 'active' | 'inactive' | 'lost';
  vehicleType?: string;
  licensePlate?: string;
  lastLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  onUpdate?: () => void;
}

export function TagCard({ 
  id, 
  name, 
  accessoryId, 
  status, 
  vehicleType,
  licensePlate,
  lastLocation,
  onUpdate 
}: TagCardProps) {
  const statusColors = {
    active: "bg-accent text-accent-foreground",
    inactive: "bg-muted text-muted-foreground",
    lost: "bg-destructive text-destructive-foreground"
  };

  const getVehicleLabel = (type?: string) => {
    const labels: Record<string, string> = {
      carro: "Carro",
      moto: "Moto",
      caminhao: "Caminhão",
      van: "Van",
      onibus: "Ônibus",
      outro: "Outro"
    };
    return type ? labels[type] || type : null;
  };

  const vehicleLabel = getVehicleLabel(vehicleType);

  return (
    <Card className="hover:shadow-glow transition-all duration-300 border-border/50 hover:border-primary/30 group">
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
        
        {(vehicleLabel || licensePlate) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <Car className="h-4 w-4 text-primary" />
            {vehicleLabel && <span>{vehicleLabel}</span>}
            {licensePlate && (
              <>
                {vehicleLabel && <span>•</span>}
                <span className="font-medium text-foreground">{licensePlate}</span>
              </>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {lastLocation ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground text-xs font-mono">
                {lastLocation.latitude.toFixed(6)}, {lastLocation.longitude.toFixed(6)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                {new Date(lastLocation.timestamp).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Signal className="h-4 w-4" />
            <span className="text-xs">Sem localização registrada</span>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-border/50">
          <Link to={`/tag/${id}`} className="flex-1">
            <Button variant="default" size="sm" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity">
              <Eye className="mr-2 h-4 w-4" />
              Detalhes
            </Button>
          </Link>
          <TagEditDialog 
            tag={{ id, name, vehicle_type: vehicleType, license_plate: licensePlate }}
            onSuccess={onUpdate}
          />
          {lastLocation && (
            <ShareLocationDialog
              tagId={id}
              tagName={name}
              latitude={lastLocation.latitude}
              longitude={lastLocation.longitude}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
