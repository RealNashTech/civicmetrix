import { withApiObservability } from "@/lib/observability/http";

async function handleGet() {
  return Response.json({
    status: "ok",
    service: "civicmetrix",
    time: new Date().toISOString()
  })
}

export const GET = withApiObservability("/api/system/health", "GET", async () => handleGet());
