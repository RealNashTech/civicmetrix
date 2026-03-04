export async function GET() {
  return Response.json({
    status: "ok",
    service: "civicmetrix",
    time: new Date().toISOString()
  })
}
