import prisma from "@/lib/prisma";
import { eventProcessingQueue } from "@/lib/queue";
import { redis } from "@/lib/redis";

async function checkDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}

async function checkRedis() {
  if (!redis) {
    throw new Error("Redis is not configured");
  }

  await redis.ping();
}

async function checkWorkerQueue() {
  if (!eventProcessingQueue) {
    throw new Error("Worker queue is not configured");
  }

  await eventProcessingQueue.getJobCounts("waiting", "active");
}

export async function GET() {
  try {
    await Promise.all([checkDatabase(), checkRedis(), checkWorkerQueue()]);

    return Response.json({
      status: "ready",
    });
  } catch {
    return Response.json(
      {
        status: "not_ready",
      },
      { status: 503 },
    );
  }
}
