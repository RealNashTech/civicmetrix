"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

type MapAsset = {
  id: string;
  name: string;
  type: string;
  status: string;
  conditionScore: number | null;
  latitude: number;
  longitude: number;
};

type AssetMapProps = {
  assets: MapAsset[];
  heightClassName?: string;
};

function markerColor(conditionScore: number | null) {
  if (conditionScore == null) {
    return "#64748b";
  }
  if (conditionScore >= 80) {
    return "#16a34a";
  }
  if (conditionScore >= 50) {
    return "#ca8a04";
  }
  return "#dc2626";
}

export default function AssetMap({ assets, heightClassName = "h-[420px]" }: AssetMapProps) {
  const fallbackCenter: [number, number] = [37.7749, -122.4194];
  const center: [number, number] =
    assets.length > 0 ? [assets[0].latitude, assets[0].longitude] : fallbackCenter;

  return (
    <div className={`w-full overflow-hidden rounded-lg border border-slate-200 ${heightClassName}`}>
      <MapContainer center={center} zoom={11} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {assets.map((asset) => (
          <CircleMarker
            key={asset.id}
            center={[asset.latitude, asset.longitude]}
            radius={8}
            pathOptions={{
              color: markerColor(asset.conditionScore),
              fillColor: markerColor(asset.conditionScore),
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-medium">{asset.name}</p>
                <p>Type: {asset.type}</p>
                <p>Status: {asset.status}</p>
                <p>Condition: {asset.conditionScore ?? "N/A"}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
