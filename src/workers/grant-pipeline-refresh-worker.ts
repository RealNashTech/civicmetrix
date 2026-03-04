import { db } from "@/lib/db"

export async function runGrantPipelineRefreshWorker() {
  console.log("[worker] refreshing grant_pipeline_summary", new Date())

  await db().$executeRaw`
    REFRESH MATERIALIZED VIEW CONCURRENTLY grant_pipeline_summary
  `

  console.log("[worker] refresh complete")
}
