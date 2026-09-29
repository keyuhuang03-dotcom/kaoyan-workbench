import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { reviewStatus } = await req.json();

  const mistake = await prisma.mistakeItem.update({
    where: { id },
    data: {
      reviewStatus,
      reviewedAt: reviewStatus === "mastered" ? new Date() : undefined,
    },
  });

  return NextResponse.json(mistake);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.mistakeItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
