"use client"

import IssueHeatmap from "./IssueHeatmap"
import GrantFlowChart from "./GrantFlowChart"
import AssetHealthChart from "./AssetHealthChart"

type Props = {
  issueData: any[]
  grantData: any[]
  assetData: any[]
}

export default function DemoVisualizationBoundary({
  issueData,
  grantData,
  assetData
}: Props) {
  return (
    <>
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Civic Issue Map</h2>
        <IssueHeatmap data={issueData} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Grant Funding Distribution</h2>
        <GrantFlowChart data={grantData} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Infrastructure Health Dashboard</h2>
        <AssetHealthChart data={assetData} />
      </div>
    </>
  )
}
