"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

type MapIssue = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  latitude: number;
  longitude: number;
};

type IssueMapProps = {
  issues: MapIssue[];
  heightClassName?: string;
};

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

export default function IssueMap({ issues, heightClassName = "h-[420px]" }: IssueMapProps) {
  const fallbackCenter: [number, number] = [37.7749, -122.4194];
  const center: [number, number] =
    issues.length > 0 ? [issues[0].latitude, issues[0].longitude] : fallbackCenter;

  return (
    <div className={`w-full overflow-hidden rounded-lg border border-slate-200 ${heightClassName}`}>
      <MapContainer center={center} zoom={11} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {issues.map((issue) => (
          <CircleMarker
            key={issue.id}
            center={[issue.latitude, issue.longitude]}
            radius={8}
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
      </MapContainer>
    </div>
  );
}
