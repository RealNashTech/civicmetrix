"use client"

import { useEffect, useRef } from "react"

type IssuePoint = {
  latitude: number
  longitude: number
  title?: string
  category?: string | null
}

type ClusterIssue = {
  id: string
  title: string
  category: string | null
  latitude: number
  longitude: number
  createdAt: string
  status: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export default function IssueHeatmap({
  data,
  slug
}: {
  data: IssuePoint[]
  slug?: string
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const popupRef = useRef<any>(null)

  useEffect(() => {
    if (!mapContainer.current) return
    if (mapRef.current) return

    async function initializeMap() {
      const container = mapContainer.current
      if (!container) return

      const mapboxgl = (await import("mapbox-gl")).default

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      if (!token) {
        console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN")
        return
      }
      mapboxgl.accessToken = token

      const map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-122.8554, 45.1437],
        zoom: 11
      })

      mapRef.current = map

      map.on("load", () => {
        const features = (data ?? []).map(issue => ({
          type: "Feature" as const,
          properties: {
            title: issue.title || "Issue",
            category: (issue.category ?? "").toLowerCase()
          },
          geometry: {
            type: "Point" as const,
            coordinates: [issue.longitude, issue.latitude] as [number, number]
          }
        }))

        map.addSource("issues", {
          type: "geojson",
          cluster: true,
          clusterRadius: 50,
          clusterMaxZoom: 14,
          clusterProperties: {
            pothole: ["+", ["case", ["==", ["get", "category"], "pothole"], 1, 0]],
            streetlight: ["+", ["case", ["==", ["get", "category"], "streetlight"], 1, 0]],
            garbage: [
              "+",
              ["case", ["any", ["==", ["get", "category"], "garbage"], ["==", ["get", "category"], "trash"]], 1, 0]
            ],
            graffiti: ["+", ["case", ["==", ["get", "category"], "graffiti"], 1, 0]],
            sidewalk: ["+", ["case", ["==", ["get", "category"], "sidewalk"], 1, 0]]
          },
          data: {
            type: "FeatureCollection",
            features
          }
        })

        map.addLayer({
          id: "issue-heat",
          type: "heatmap",
          source: "issues",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "heatmap-weight": 1,
            "heatmap-intensity": 1,
            "heatmap-radius": 20,
            "heatmap-opacity": 0.8
          }
        })

        map.addLayer({
          id: "issue-clusters",
          type: "circle",
          source: "issues",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#0f172a",
            "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 30, 24],
            "circle-opacity": 0.85,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff"
          }
        })

        map.addLayer({
          id: "issue-cluster-count",
          type: "symbol",
          source: "issues",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12
          },
          paint: {
            "text-color": "#ffffff"
          }
        })

        const showPopup = (cluster: Record<string, unknown>, lngLat: [number, number]) => {
          const total = Number(cluster.point_count ?? 0)
          const pothole = Number(cluster.pothole ?? 0)
          const streetlight = Number(cluster.streetlight ?? 0)
          const garbage = Number(cluster.garbage ?? 0)
          const graffiti = Number(cluster.graffiti ?? 0)
          const sidewalk = Number(cluster.sidewalk ?? 0)
          const longitude = Number(lngLat[0].toFixed(6))
          const latitude = Number(lngLat[1].toFixed(6))

          if (popupRef.current) {
            popupRef.current.remove()
          }

          const popupContent = document.createElement("div")
          popupContent.style.minWidth = "260px"
          popupContent.style.maxWidth = "300px"
          popupContent.style.fontFamily = "system-ui, sans-serif"
          popupContent.innerHTML = `
            <div style="font-weight:700;margin-bottom:8px;">Cluster Summary</div>
            <div style="margin-bottom:6px;">Total Issues: ${total}</div>
            <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px;">
              <button type="button" data-category="pothole" style="text-align:left;border:1px solid #cbd5e1;border-radius:6px;padding:6px 8px;background:white;cursor:pointer;">Potholes: ${pothole}</button>
              <button type="button" data-category="streetlight" style="text-align:left;border:1px solid #cbd5e1;border-radius:6px;padding:6px 8px;background:white;cursor:pointer;">Streetlights: ${streetlight}</button>
              <button type="button" data-category="garbage" style="text-align:left;border:1px solid #cbd5e1;border-radius:6px;padding:6px 8px;background:white;cursor:pointer;">Garbage: ${garbage}</button>
              <button type="button" data-category="graffiti" style="text-align:left;border:1px solid #cbd5e1;border-radius:6px;padding:6px 8px;background:white;cursor:pointer;">Graffiti: ${graffiti}</button>
              <button type="button" data-category="sidewalk" style="text-align:left;border:1px solid #cbd5e1;border-radius:6px;padding:6px 8px;background:white;cursor:pointer;">Sidewalk: ${sidewalk}</button>
            </div>
            <div data-role="cluster-results" style="max-height:180px;overflow:auto;border-top:1px solid #e2e8f0;padding-top:8px;color:#475569;">
              Click a category to load issues.
            </div>
          `

          popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
            .setLngLat([longitude, latitude])
            .setDOMContent(popupContent)
            .addTo(map)

          const popupElement = popupRef.current.getElement() as HTMLElement
          const resultsElement = popupElement.querySelector("[data-role='cluster-results']") as HTMLElement | null
          const categoryButtons = popupElement.querySelectorAll<HTMLButtonElement>("button[data-category]")

          const renderIssues = (issues: ClusterIssue[]) => {
            if (!resultsElement) return
            if (!issues.length) {
              resultsElement.innerHTML = `<div style="font-size:12px;">No issues found for this category.</div>`
              return
            }

            const issueMarkup = issues
              .map((issue) => {
                const issueDate = new Date(issue.createdAt).toLocaleDateString("en-US")
                const href = slug ? `/public/${slug}/issues/${issue.id}` : "#"
                return `
                  <a href="${href}" style="display:block;padding:6px 0;border-bottom:1px solid #e2e8f0;text-decoration:none;color:#0f172a;">
                    <div style="font-weight:600;font-size:12px;">${escapeHtml(issue.title)}</div>
                    <div style="font-size:11px;color:#64748b;">${escapeHtml(issue.category ?? "Uncategorized")} | ${escapeHtml(issue.status)} | ${issueDate}</div>
                  </a>
                `
              })
              .join("")

            resultsElement.innerHTML = issueMarkup
          }

          const fetchIssues = async (category: string) => {
            if (!resultsElement) return
            if (!slug) {
              resultsElement.innerHTML = `<div style="font-size:12px;">Issue drilldown unavailable.</div>`
              return
            }

            resultsElement.innerHTML = `<div style="font-size:12px;">Loading issues...</div>`

            try {
              const params = new URLSearchParams({
                slug,
                latitude: String(latitude),
                longitude: String(longitude),
                radius: "800",
                category
              })
              const response = await fetch(`/api/public/issues-by-cluster?${params.toString()}`)
              if (!response.ok) {
                throw new Error("Failed to fetch issues")
              }
              const payload = (await response.json()) as { issues?: ClusterIssue[] }
              renderIssues(payload.issues ?? [])
            } catch (error) {
              console.error("Failed to load cluster issues", error)
              resultsElement.innerHTML = `<div style="font-size:12px;">Failed to load issues.</div>`
            }
          }

          for (const button of categoryButtons) {
            button.addEventListener("click", () => {
              const category = button.dataset.category ?? ""
              if (!category) return
              fetchIssues(category)
            })
          }
        }

        map.on("click", "issue-clusters", (event: any) => {
          const featuresAtPoint = map.queryRenderedFeatures(event.point, {
            layers: ["issue-clusters"]
          })
          if (!featuresAtPoint.length) return

          const clusterFeature = featuresAtPoint[0]
          const geometry = clusterFeature.geometry as unknown as {
            coordinates?: [number, number]
          }
          const coordinates = geometry.coordinates
          if (!coordinates || coordinates.length < 2) return
          const clusterProperties = (clusterFeature.properties ?? {}) as Record<string, unknown>

          showPopup(clusterProperties, [coordinates[0], coordinates[1]])
        })

        map.on("mouseenter", "issue-clusters", () => {
          map.getCanvas().style.cursor = "pointer"
        })

        map.on("mouseleave", "issue-clusters", () => {
          map.getCanvas().style.cursor = ""
        })
      })
    }

    setTimeout(() => {
      initializeMap()
    }, 0)

    return () => {
      if (popupRef.current) {
        popupRef.current.remove()
        popupRef.current = null
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [data, slug])

  return (
    <div
      ref={mapContainer}
      style={{ width: "100%", height: 420 }}
    />
  )
}
