import prisma from "@/lib/prisma";

export function getSystemDb() {
  return prisma;
}
