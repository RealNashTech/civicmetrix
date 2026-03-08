"use client"

import { useEffect, useRef } from "react"

type IssuePoint = {
  latitude: number
  longitude: number
  title?: string
}

export default function IssueHeatmap({ data }: { data: IssuePoint[] }) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!mapContainer.current) return
    if (mapRef.current) return

    async function initializeMap() {
      const container = mapContainer.current
      if (!container) return

      const mapboxgl = (await import("mapbox-gl")).default

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

      const map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-122.8554, 45.1437],
        zoom: 11
      })

      mapRef.current = map

      map.on("load", () => {
        if (!data || data.length === 0) return

        const features = data.map(issue => ({
          type: "Feature" as const,
          properties: { title: issue.title || "Issue" },
          geometry: {
            type: "Point" as const,
            coordinates: [issue.longitude, issue.latitude] as [number, number]
          }
        }))

        map.addSource("issues", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features
          }
        })

        map.addLayer({
          id: "issue-heat",
          type: "heatmap",
          source: "issues",
          paint: {
            "heatmap-weight": 1,
            "heatmap-intensity": 1,
            "heatmap-radius": 20,
            "heatmap-opacity": 0.8
          }
        })
      })
    }

    initializeMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [data])

  return (
    <div
      ref={mapContainer}
      style={{ width: "100%", height: 420 }}
    />
  )
}
