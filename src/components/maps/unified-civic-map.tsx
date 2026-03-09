"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MapIssue = {
  id: string;
  title: string;
  department: string | null;
  status: string;
  createdAt: string;
  latitude: number;
  longitude: number;
};

type MapAsset = {
  id: string;
  name: string;
  department: string | null;
  status: string;
  conditionScore: number | null;
  createdAt: string;
  latitude: number;
  longitude: number;
};

type MapWorkOrder = {
  id: string;
  title: string;
  department: string | null;
  status: string;
  createdAt: string;
  linkedAsset: string | null;
  linkedIssue: string | null;
  latitude: number;
  longitude: number;
};

type MapGrant = {
  id: string;
  title: string;
  department: string | null;
  status: string;
  createdAt: string;
  latitude: number;
  longitude: number;
};

type SelectedItem = {
  layer: "issues" | "assets" | "workOrders" | "grants";
  title: string;
  department: string | null;
  status: string;
  createdAt: string;
  linkedAsset: string | null;
  linkedIssue: string | null;
};

type Props = {
  issues: MapIssue[];
  assets: MapAsset[];
  workOrders: MapWorkOrder[];
  grants: MapGrant[];
};

type Feature = {
  type: "Feature";
  properties: Record<string, string | number | null>;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
};

function isoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function makeFeature(
  longitude: number,
  latitude: number,
  properties: Record<string, string | number | null>,
): Feature {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
  };
}

export default function UnifiedCivicMap({ issues, assets, workOrders, grants }: Props) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  const [showIssues, setShowIssues] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [showWorkOrders, setShowWorkOrders] = useState(true);
  const [showGrants, setShowGrants] = useState(true);
  const [selected, setSelected] = useState<SelectedItem | null>(null);

  const center = useMemo((): [number, number] => {
    const all = [
      ...issues.map((item) => [item.longitude, item.latitude] as const),
      ...assets.map((item) => [item.longitude, item.latitude] as const),
      ...workOrders.map((item) => [item.longitude, item.latitude] as const),
      ...grants.map((item) => [item.longitude, item.latitude] as const),
    ];
    if (all.length === 0) {
      return [-122.8554, 45.1437];
    }
    const avgLng = all.reduce((sum, item) => sum + item[0], 0) / all.length;
    const avgLat = all.reduce((sum, item) => sum + item[1], 0) / all.length;
    return [avgLng, avgLat];
  }, [assets, grants, issues, workOrders]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) {
      return;
    }

    async function initialize() {
      const mapboxgl = (await import("mapbox-gl")).default;
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        return;
      }
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainer.current as HTMLDivElement,
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom: 11,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        const issueFeatures = issues.map((item) =>
          makeFeature(item.longitude, item.latitude, {
            id: item.id,
            title: item.title,
            department: item.department,
            status: item.status,
            createdAt: item.createdAt,
          }),
        );
        const assetFeatures = assets.map((item) =>
          makeFeature(item.longitude, item.latitude, {
            id: item.id,
            title: item.name,
            department: item.department,
            status: item.status,
            createdAt: item.createdAt,
            conditionScore: item.conditionScore,
            color:
              item.conditionScore !== null && item.conditionScore <= 40
                ? "#dc2626"
                : item.conditionScore !== null && item.conditionScore <= 70
                  ? "#eab308"
                  : "#16a34a",
          }),
        );
        const workOrderFeatures = workOrders.map((item) =>
          makeFeature(item.longitude, item.latitude, {
            id: item.id,
            title: item.title,
            department: item.department,
            status: item.status,
            createdAt: item.createdAt,
            linkedAsset: item.linkedAsset,
            linkedIssue: item.linkedIssue,
            color:
              item.status === "OPEN" ? "#dc2626" : item.status === "IN_PROGRESS" ? "#eab308" : "#16a34a",
          }),
        );
        const grantFeatures = grants.map((item) =>
          makeFeature(item.longitude, item.latitude, {
            id: item.id,
            title: item.title,
            department: item.department,
            status: item.status,
            createdAt: item.createdAt,
          }),
        );

        const addLayerSet = (
          sourceId: string,
          features: Feature[],
          colorExpr: any,
          markerId: string,
          clusterId: string,
          countId: string,
        ) => {
          map.addSource(sourceId, {
            type: "geojson",
            cluster: true,
            clusterRadius: 40,
            clusterMaxZoom: 13,
            data: {
              type: "FeatureCollection",
              features,
            },
          });

          map.addLayer({
            id: clusterId,
            type: "circle",
            source: sourceId,
            filter: ["has", "point_count"],
            paint: {
              "circle-color": "#334155",
              "circle-radius": ["step", ["get", "point_count"], 15, 20, 18, 50, 24],
              "circle-opacity": 0.8,
            },
          });

          map.addLayer({
            id: countId,
            type: "symbol",
            source: sourceId,
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
            },
            paint: {
              "text-color": "#ffffff",
            },
          });

          map.addLayer({
            id: markerId,
            type: "circle",
            source: sourceId,
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": colorExpr,
              "circle-radius": 7,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.25,
            },
          });
        };

        addLayerSet("issues-source", issueFeatures, "#dc2626", "issues-markers", "issues-clusters", "issues-count");
        addLayerSet(
          "assets-source",
          assetFeatures,
          ["coalesce", ["get", "color"], "#64748b"],
          "assets-markers",
          "assets-clusters",
          "assets-count",
        );
        addLayerSet(
          "work-orders-source",
          workOrderFeatures,
          ["coalesce", ["get", "color"], "#64748b"],
          "work-orders-markers",
          "work-orders-clusters",
          "work-orders-count",
        );
        addLayerSet("grants-source", grantFeatures, "#2563eb", "grants-markers", "grants-clusters", "grants-count");

        const clickMarker = (layer: SelectedItem["layer"], markerLayerId: string) => {
          map.on("click", markerLayerId, (event: any) => {
            const feature = event?.features?.[0];
            if (!feature?.properties) {
              return;
            }
            const props = feature.properties as Record<string, string>;
            setSelected({
              layer,
              title: props.title ?? "Untitled",
              department: props.department ?? null,
              status: props.status ?? "N/A",
              createdAt: props.createdAt ?? "",
              linkedAsset: props.linkedAsset ?? null,
              linkedIssue: props.linkedIssue ?? null,
            });
          });
          map.on("mouseenter", markerLayerId, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", markerLayerId, () => {
            map.getCanvas().style.cursor = "";
          });
        };

        clickMarker("issues", "issues-markers");
        clickMarker("assets", "assets-markers");
        clickMarker("workOrders", "work-orders-markers");
        clickMarker("grants", "grants-markers");

        const expandCluster = (clusterLayerId: string, sourceId: string) => {
          map.on("click", clusterLayerId, (event: any) => {
            const cluster = map.queryRenderedFeatures(event.point, { layers: [clusterLayerId] })[0];
            if (!cluster) return;
            const clusterId = cluster.properties?.cluster_id;
            const source = map.getSource(sourceId) as any;
            if (!source?.getClusterExpansionZoom) return;
            source.getClusterExpansionZoom(clusterId, (error: Error | null, zoom: number) => {
              if (error) return;
              const coordinates = (cluster.geometry as unknown as { coordinates?: [number, number] }).coordinates;
              if (!coordinates) return;
              map.easeTo({
                center: coordinates,
                zoom,
              });
            });
          });
        };

        expandCluster("issues-clusters", "issues-source");
        expandCluster("assets-clusters", "assets-source");
        expandCluster("work-orders-clusters", "work-orders-source");
        expandCluster("grants-clusters", "grants-source");
      });
    }

    void initialize();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [assets, center, grants, issues, workOrders]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const setVisibility = (ids: string[], visible: boolean) => {
      ids.forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        }
      });
    };

    setVisibility(["issues-markers", "issues-clusters", "issues-count"], showIssues);
    setVisibility(["assets-markers", "assets-clusters", "assets-count"], showAssets);
    setVisibility(["work-orders-markers", "work-orders-clusters", "work-orders-count"], showWorkOrders);
    setVisibility(["grants-markers", "grants-clusters", "grants-count"], showGrants);
  }, [showAssets, showGrants, showIssues, showWorkOrders]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-2 text-sm font-medium text-slate-900">Layer Toggle Panel</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showIssues} onChange={(e) => setShowIssues(e.target.checked)} />
              Issues
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showAssets} onChange={(e) => setShowAssets(e.target.checked)} />
              Assets
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showWorkOrders}
                onChange={(e) => setShowWorkOrders(e.target.checked)}
              />
              Work Orders
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showGrants} onChange={(e) => setShowGrants(e.target.checked)} />
              Grants
            </label>
          </div>
        </div>
        <div ref={mapContainer} className="h-[620px] w-full overflow-hidden rounded-lg border border-slate-200" />
      </div>

      <aside className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Record Details</h3>
        {selected ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Layer:</span> {selected.layer}
            </p>
            <p>
              <span className="font-medium text-slate-900">Title / Name:</span> {selected.title}
            </p>
            <p>
              <span className="font-medium text-slate-900">Department:</span> {selected.department ?? "N/A"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Status:</span> {selected.status}
            </p>
            <p>
              <span className="font-medium text-slate-900">Created Date:</span> {isoDate(selected.createdAt)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Linked Asset:</span> {selected.linkedAsset ?? "N/A"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Linked Issue:</span> {selected.linkedIssue ?? "N/A"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Click a marker to view details.</p>
        )}
      </aside>
    </div>
  );
}
