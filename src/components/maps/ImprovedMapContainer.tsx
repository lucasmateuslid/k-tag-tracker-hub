import { useState, useEffect } from "react";
import { MapboxMap } from "./MapboxMap";
import { GoogleMap } from "./GoogleMap";
import { LeafletMap } from "./LeafletMap";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

type MapProvider = "mapbox" | "google" | "openstreetmap";

interface ImprovedMapContainerProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  markerTitle?: string;
  preferredProvider?: MapProvider;
  mapboxKey?: string;
  googleKey?: string;
}

export function ImprovedMapContainer({
  latitude,
  longitude,
  zoom = 15,
  markerTitle,
  preferredProvider = "mapbox",
  mapboxKey = "",
  googleKey = "",
}: ImprovedMapContainerProps) {
  const [currentProvider, setCurrentProvider] = useState<MapProvider>(preferredProvider);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setCurrentProvider(preferredProvider);
    setHasError(false);
  }, [preferredProvider]);

  const fallbackToOpenStreetMap = () => {
    console.warn(`${currentProvider} failed, falling back to OpenStreetMap`);
    setCurrentProvider("openstreetmap");
    setHasError(false);
  };

  const handleMapError = (provider: string, error: string) => {
    console.error(`Error with ${provider}:`, error);
    setErrorMessage(`Erro ao carregar ${provider}: ${error}`);
    
    if (provider !== "openstreetmap") {
      fallbackToOpenStreetMap();
    } else {
      setHasError(true);
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setCurrentProvider(preferredProvider);
  };

  if (hasError && currentProvider === "openstreetmap") {
    return (
      <div className="w-full h-[400px] rounded-lg bg-muted flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar mapa</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {errorMessage || "Não foi possível carregar o mapa. Por favor, verifique sua conexão."}
        </p>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const mapProps = {
    latitude,
    longitude,
    zoom,
    markerTitle,
  };

  try {
    switch (currentProvider) {
      case "mapbox":
        if (!mapboxKey) {
          fallbackToOpenStreetMap();
          return <LeafletMap {...mapProps} />;
        }
        return <MapboxMap {...mapProps} apiKey={mapboxKey} />;
      
      case "google":
        if (!googleKey) {
          fallbackToOpenStreetMap();
          return <LeafletMap {...mapProps} />;
        }
        return <GoogleMap {...mapProps} apiKey={googleKey} />;
      
      case "openstreetmap":
      default:
        return <LeafletMap {...mapProps} />;
    }
  } catch (error) {
    console.error("Map rendering error:", error);
    if (currentProvider !== "openstreetmap") {
      fallbackToOpenStreetMap();
      return <LeafletMap {...mapProps} />;
    }
    return (
      <div className="w-full h-[400px] rounded-lg bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Erro ao renderizar mapa</p>
      </div>
    );
  }
}
