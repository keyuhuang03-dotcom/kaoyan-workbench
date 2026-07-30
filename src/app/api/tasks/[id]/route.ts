import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { completed } = await req.json();

  const task = await prisma.task.update({
    where: { id },
    data: { completed },
  });

  return NextResponse.json(task);
}
