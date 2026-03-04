import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const document = await db().document.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      name: true,
      fileUrl: true,
      type: true,
      organizationId: true,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const safeFilePath = path.join(process.cwd(), "data", "uploads", document.fileUrl);
  try {
    await stat(safeFilePath);
  } catch {
    return NextResponse.json({ error: "Stored file not found." }, { status: 404 });
  }

  const nodeStream = createReadStream(safeFilePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": document.type,
      "Content-Disposition": `inline; filename="${document.name.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
