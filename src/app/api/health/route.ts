import prisma from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  } catch {
    return Response.json(
      {
        status: "error",
        uptime: process.uptime(),
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}
