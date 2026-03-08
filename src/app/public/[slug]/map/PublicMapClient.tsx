"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { useRouter } from "next/navigation"

import ReportIssueForm from "@/components/public/ReportIssueForm"

const CivicIntelligenceMap = dynamic(
  () => import("@/components/maps/civic-intelligence-map"),
  { ssr: false }
)

type PublicMapClientProps = {
  slug: string
  issues: Array<{
    id: string
    title: string
    description?: string | null
    category?: string | null
    status: string
    priority: string | null
    createdAt?: string | Date | null
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
  slug,
  issues,
  serviceZones,
  infrastructureLayers,
}: PublicMapClientProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mapVersion, setMapVersion] = useState(0)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Report an Issue
        </button>
      </div>

      <CivicIntelligenceMap
        key={`public-map-${mapVersion}`}
        issues={issues}
        districts={[]}
        wards={[]}
        serviceZones={serviceZones}
        infrastructureLayers={infrastructureLayers}
      />

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Report a Civic Issue</h2>
                <p className="text-sm text-slate-600">Submit a new issue directly from the public map.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <ReportIssueForm
              slug={slug}
              onSubmitted={() => {
                router.refresh()
                setMapVersion((previous) => previous + 1)
                setIsModalOpen(false)
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
