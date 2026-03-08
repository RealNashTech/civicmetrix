"use client";

import type { GeoJsonObject } from "geojson";
import { useMemo, useState } from "react";
import {
  Circle,
  CircleMarker,
  GeoJSON,
  LayersControl,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

type IssueCategory = "pothole" | "streetlight" | "garbage" | "graffiti" | "sidewalk";

type MapIssue = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  category?: string | null;
  description?: string | null;
  createdAt?: string | Date | null;
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

const ISSUE_CATEGORIES: IssueCategory[] = ["pothole", "streetlight", "garbage", "graffiti", "sidewalk"];

type CategoryCounts = Record<IssueCategory, number>;

type IssueCluster = {
  id: string;
  latitude: number;
  longitude: number;
  total: number;
  categoryCounts: CategoryCounts;
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

function normalizeCategory(category: string | null | undefined): IssueCategory | null {
  if (!category) {
    return null;
  }
  const normalized = category.trim().toLowerCase();
  if (ISSUE_CATEGORIES.includes(normalized as IssueCategory)) {
    return normalized as IssueCategory;
  }
  return null;
}

function emptyCategoryCounts(): CategoryCounts {
  return {
    pothole: 0,
    streetlight: 0,
    garbage: 0,
    graffiti: 0,
    sidewalk: 0,
  };
}

function categoryColor(category: string | null | undefined) {
  const normalized = normalizeCategory(category);
  if (normalized === "pothole") return "#dc2626";
  if (normalized === "streetlight") return "#eab308";
  if (normalized === "garbage") return "#16a34a";
  if (normalized === "graffiti") return "#9333ea";
  if (normalized === "sidewalk") return "#2563eb";
  return "#64748b";
}

function categoryLabel(category: string | null | undefined) {
  const normalized = normalizeCategory(category);
  if (normalized === "streetlight") return "Streetlight";
  if (normalized === "sidewalk") return "Sidewalk";
  if (normalized === "garbage") return "Garbage";
  if (normalized === "graffiti") return "Graffiti";
  if (normalized === "pothole") return "Pothole";
  return "Other";
}

function readableStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatReportedDate(value: string | Date | null | undefined) {
  if (!value) {
    return "Unknown";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
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

function clusterGridSize(zoom: number) {
  if (zoom < 9) return 0.08;
  if (zoom < 11) return 0.04;
  return 0.02;
}

function aggregateIssueClusters(issues: MapIssue[], zoom: number) {
  const grid = clusterGridSize(zoom);
  const buckets = new Map<
    string,
    {
      sumLat: number;
      sumLng: number;
      total: number;
      categoryCounts: CategoryCounts;
    }
  >();

  for (const issue of issues) {
    const keyLat = Math.floor(issue.latitude / grid);
    const keyLng = Math.floor(issue.longitude / grid);
    const key = `${keyLat}:${keyLng}`;
    const existing = buckets.get(key);
    const category = normalizeCategory(issue.category);

    if (!existing) {
      const categoryCounts = emptyCategoryCounts();
      if (category) {
        categoryCounts[category] += 1;
      }
      buckets.set(key, {
        sumLat: issue.latitude,
        sumLng: issue.longitude,
        total: 1,
        categoryCounts,
      });
      continue;
    }

    existing.sumLat += issue.latitude;
    existing.sumLng += issue.longitude;
    existing.total += 1;
    if (category) {
      existing.categoryCounts[category] += 1;
    }
  }

  const clusters: IssueCluster[] = [];
  for (const [id, bucket] of buckets.entries()) {
    clusters.push({
      id,
      latitude: bucket.sumLat / bucket.total,
      longitude: bucket.sumLng / bucket.total,
      total: bucket.total,
      categoryCounts: bucket.categoryCounts,
    });
  }

  return clusters;
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

function IssueMarkersLayer({ issues }: { issues: MapIssue[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });

  const clusters = useMemo(() => aggregateIssueClusters(issues, zoom), [issues, zoom]);
  const useClusters = zoom < 13;

  if (useClusters) {
    return (
      <>
        {clusters.map((cluster) => (
          <CircleMarker
            key={`cluster-${cluster.id}`}
            center={[cluster.latitude, cluster.longitude]}
            radius={Math.min(26, 8 + cluster.total)}
            pathOptions={{
              color: "#7c3aed",
              fillColor: "#8b5cf6",
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">Cluster Summary</p>
                <p>Total issues: {cluster.total}</p>
                <p>Pothole: {cluster.categoryCounts.pothole}</p>
                <p>Streetlight: {cluster.categoryCounts.streetlight}</p>
                <p>Garbage: {cluster.categoryCounts.garbage}</p>
                <p>Graffiti: {cluster.categoryCounts.graffiti}</p>
                <p>Sidewalk: {cluster.categoryCounts.sidewalk}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </>
    );
  }

  return (
    <>
      {issues.map((issue) => {
        const color = categoryColor(issue.category) || markerColor(issue.priority);
        return (
          <CircleMarker
            key={issue.id}
            center={[issue.latitude, issue.longitude]}
            radius={7}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <strong>{issue.title || categoryLabel(issue.category)}</strong>
                <p>Category: {categoryLabel(issue.category)}</p>
                <p>{issue.description || "No description provided."}</p>
                <p>Status: {readableStatus(issue.status)}</p>
                <p>Reported: {formatReportedDate(issue.createdAt)}</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
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
            <IssueMarkersLayer issues={issues} />
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
