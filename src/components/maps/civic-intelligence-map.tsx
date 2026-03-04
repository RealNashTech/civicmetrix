"use client";

import type { GeoJsonObject } from "geojson";
import {
  Circle,
  CircleMarker,
  GeoJSON,
  LayersControl,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";

type MapIssue = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  latitude: number;
  longitude: number;
};

type GeoFeature = {
  id: string;
  name: string;
  geoJson: unknown;
};

type ServiceZoneFeature = GeoFeature & {
  type: string;
};

type CivicIntelligenceMapProps = {
  issues: MapIssue[];
  clusterCenters?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    clusterCount: number;
    radiusMeters: number;
  }>;
  districts: GeoFeature[];
  wards: GeoFeature[];
  serviceZones: ServiceZoneFeature[];
  infrastructureLayers: GeoFeature[];
  heightClassName?: string;
};

function toGeoJsonObject(value: unknown): GeoJsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as { type?: unknown };
  if (typeof candidate.type !== "string") {
    return null;
  }

  return value as GeoJsonObject;
}

function markerColor(priority: string | null) {
  if (priority === "URGENT") {
    return "#dc2626";
  }
  if (priority === "HIGH") {
    return "#ea580c";
  }
  if (priority === "MEDIUM") {
    return "#ca8a04";
  }
  return "#2563eb";
}

function computeHeatPoints(issues: MapIssue[]) {
  const buckets = new Map<string, { latitude: number; longitude: number; count: number }>();

  for (const issue of issues) {
    const lat = Number(issue.latitude.toFixed(2));
    const lon = Number(issue.longitude.toFixed(2));
    const key = `${lat},${lon}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    buckets.set(key, { latitude: lat, longitude: lon, count: 1 });
  }

  return [...buckets.values()];
}

export default function CivicIntelligenceMap({
  issues,
  clusterCenters = [],
  districts,
  wards,
  serviceZones,
  infrastructureLayers,
  heightClassName = "h-[560px]",
}: CivicIntelligenceMapProps) {
  const fallbackCenter: [number, number] = [37.7749, -122.4194];
  const center: [number, number] =
    clusterCenters.length > 0
      ? [clusterCenters[0].latitude, clusterCenters[0].longitude]
      : issues.length > 0
        ? [issues[0].latitude, issues[0].longitude]
        : fallbackCenter;
  const heatPoints = computeHeatPoints(issues);

  return (
    <div className={`w-full overflow-hidden rounded-lg border border-slate-200 ${heightClassName}`}>
      <MapContainer center={center} zoom={11} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LayersControl position="topright">
          <LayersControl.Overlay checked name="Issue Markers">
            <>
              {issues.map((issue) => (
                <CircleMarker
                  key={issue.id}
                  center={[issue.latitude, issue.longitude]}
                  radius={6}
                  pathOptions={{
                    color: markerColor(issue.priority),
                    fillColor: markerColor(issue.priority),
                    fillOpacity: 0.85,
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-medium">{issue.title}</p>
                      <p>Status: {issue.status}</p>
                      <p>Priority: {issue.priority ?? "Unset"}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Issue Heatmap">
            <>
              {heatPoints.map((point) => (
                <CircleMarker
                  key={`${point.latitude}-${point.longitude}`}
                  center={[point.latitude, point.longitude]}
                  radius={Math.min(28, 6 + point.count * 2)}
                  pathOptions={{
                    color: "#ef4444",
                    fillColor: "#f97316",
                    fillOpacity: 0.25,
                  }}
                >
                  <Popup>{point.count} issues in this area</Popup>
                </CircleMarker>
              ))}
            </>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Service Clusters">
            <>
              {clusterCenters.map((cluster) => (
                <Circle
                  key={cluster.id}
                  center={[cluster.latitude, cluster.longitude]}
                  radius={cluster.radiusMeters}
                  pathOptions={{
                    color: "#7c3aed",
                    fillColor: "#a78bfa",
                    fillOpacity: 0.12,
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-medium">Service cluster</p>
                      <p>{cluster.clusterCount} issue reports</p>
                      <p>Radius: {cluster.radiusMeters}m</p>
                    </div>
                  </Popup>
                </Circle>
              ))}
            </>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Districts">
            <>
              {districts.map((district) => (
                (() => {
                  const geoJson = toGeoJsonObject(district.geoJson);
                  if (!geoJson) {
                    return null;
                  }
                  return <GeoJSON key={district.id} data={geoJson} />;
                })()
              ))}
            </>
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Wards">
            <>
              {wards.map((ward) => (
                (() => {
                  const geoJson = toGeoJsonObject(ward.geoJson);
                  if (!geoJson) {
                    return null;
                  }
                  return <GeoJSON key={ward.id} data={geoJson} />;
                })()
              ))}
            </>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Service Zones">
            <>
              {serviceZones.map((zone) => (
                (() => {
                  const geoJson = toGeoJsonObject(zone.geoJson);
                  if (!geoJson) {
                    return null;
                  }
                  return (
                    <GeoJSON key={zone.id} data={geoJson}>
                      <Popup>
                        <div>
                          <p className="font-medium">{zone.name}</p>
                          <p>Type: {zone.type}</p>
                        </div>
                      </Popup>
                    </GeoJSON>
                  );
                })()
              ))}
            </>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Infrastructure Layers">
            <>
              {infrastructureLayers.map((layer) => (
                (() => {
                  const geoJson = toGeoJsonObject(layer.geoJson);
                  if (!geoJson) {
                    return null;
                  }
                  return (
                    <GeoJSON key={layer.id} data={geoJson}>
                      <Popup>{layer.name}</Popup>
                    </GeoJSON>
                  );
                })()
              ))}
            </>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}
