"use client"

import dynamic from "next/dynamic"

const CivicIntelligenceMap = dynamic(
  () => import("@/components/maps/civic-intelligence-map"),
  { ssr: false }
)

type PublicMapClientProps = {
  issues: Array<{
    id: string
    title: string
    status: string
    priority: string | null
    latitude: number
    longitude: number
  }>
  serviceZones: Array<{
    id: string
    name: string
    type: string
    geoJson: unknown
  }>
  infrastructureLayers: Array<{
    id: string
    name: string
    geoJson: unknown
  }>
}

export default function PublicMapClient({
  issues,
  serviceZones,
  infrastructureLayers,
}: PublicMapClientProps) {
  return (
    <CivicIntelligenceMap
      issues={issues}
      districts={[]}
      wards={[]}
      serviceZones={serviceZones}
      infrastructureLayers={infrastructureLayers}
    />
  )
}
