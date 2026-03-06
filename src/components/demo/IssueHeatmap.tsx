"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

type Issue = {
  latitude: number
  longitude: number
}

export default function IssueHeatmap({ issues }: { issues: Issue[] }) {
  const mapContainer = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-122.8554, 45.1437],
      zoom: 12,
    })

    const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: "FeatureCollection",
      features: issues.map((issue) => ({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [issue.longitude, issue.latitude],
        },
      })),
    }

    map.on("load", () => {
      map.addSource("issues", {
        type: "geojson",
        data: geojson,
      })

      map.addLayer({
        id: "issue-heat",
        type: "heatmap",
        source: "issues",
        paint: {
          "heatmap-weight": 1,
          "heatmap-radius": 25,
          "heatmap-intensity": 1.2,
        },
      })
    })

    return () => map.remove()
  }, [issues])

  return (
    <div
      ref={mapContainer}
      className="w-full h-[400px] rounded-lg border mt-4"
    />
  )
}
