import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface BackupPayload {
  version: 1;
  exportedAt: string;
  data: {
    users: Array<{ id: string; name: string; examDate: string; createdAt: string }>;
    subjects: Array<{ id: string; name: string; targetScore: number | null; color: string; createdAt: string }>;
    chapters: Array<{ id: string; subjectId: string; name: string; progress: number; order: number }>;
    knowledgeNodes: Array<{ id: string; subjectId: string; chapterId: string | null; parentId: string | null; name: string; masteryLevel: number; status: string; tags: string | null; pageStart: number | null; pageEnd: number | null; description: string | null; nextReviewAt: string | null; lastReviewAt: string | null; createdAt: string }>;
    relations: Array<{ id: string; sourceId: string; targetId: string; label: string | null }>;
    mistakes: Array<{ id: string; subjectId: string; knowledgeNodeId: string | null; title: string; content: string; imageUrl: string | null; answer: string | null; errorType: string | null; errorReason: string | null; aiAnalysis: string | null; relatedKnowledge: string | null; reviewStatus: string; createdAt: string; reviewedAt: string | null }>;
    sessions: Array<{ id: string; userId: string; subjectId: string; date: string; durationMinutes: number; notes: string | null }>;
    tasks: Array<{ id: string; userId: string; subjectId: string | null; title: string; completed: boolean; priority: number; date: string; createdAt: string }>;
    reviews: Array<{ id: string; date: string; rating: number; aiSummary: string; strengths: string | null; problems: string | null; suggestion: string | null; createdAt: string }>;
    resources: Array<{ id: string; subjectId: string; knowledgeNodeId: string | null; title: string; type: string; fileUrl: string | null; tags: string | null; createdAt: string }>;
    notes: Array<{ id: string; title: string; content: string; tags: string | null; createdAt: string; updatedAt: string; knowledgeNodeIds: string[] }>;
  };
}

export async function GET() {
  const [users, subjects, chapters, knowledgeNodes, relations, mistakes, sessions, tasks, reviews, resources, notes] = await Promise.all([
    prisma.user.findMany(),
    prisma.subject.findMany(),
    prisma.chapter.findMany(),
    prisma.knowledgeNode.findMany(),
    prisma.knowledgeNodeRelation.findMany(),
    prisma.mistakeItem.findMany(),
    prisma.studySession.findMany(),
    prisma.task.findMany(),
    prisma.dailyReview.findMany(),
    prisma.resource.findMany(),
    prisma.note.findMany({ include: { knowledgeNodes: { select: { id: true } } } }),
  ]);

  return NextResponse.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      users,
      subjects,
      chapters,
      knowledgeNodes,
      relations,
      mistakes,
      sessions,
      tasks,
      reviews,
      resources,
      notes: notes.map(({ knowledgeNodes: linkedNodes, ...note }) => ({
        ...note,
        knowledgeNodeIds: linkedNodes.map((node) => node.id),
      })),
    },
  });
}

const date = (value: string) => new Date(value);
const optionalDate = (value: string | null) => value ? new Date(value) : null;

export async function POST(req: NextRequest) {
  try {
    const backup = await req.json() as BackupPayload;
    if (backup?.version !== 1 || !backup.data || !Array.isArray(backup.data.users)) {
      return NextResponse.json({ error: "备份文件格式无效" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.studySession.deleteMany();
      await tx.task.deleteMany();
      await tx.mistakeItem.deleteMany();
      await tx.dailyReview.deleteMany();
      await tx.note.deleteMany();
      await tx.resource.deleteMany();
      await tx.knowledgeNodeRelation.deleteMany();
      await tx.knowledgeNode.deleteMany();
      await tx.chapter.deleteMany();
      await tx.subject.deleteMany();
      await tx.user.deleteMany();

      if (backup.data.users.length) await tx.user.createMany({ data: backup.data.users.map((item) => ({ ...item, examDate: date(item.examDate), createdAt: date(item.createdAt) })) });
      if (backup.data.subjects.length) await tx.subject.createMany({ data: backup.data.subjects.map((item) => ({ ...item, createdAt: date(item.createdAt) })) });
      if (backup.data.chapters.length) await tx.chapter.createMany({ data: backup.data.chapters });
      if (backup.data.knowledgeNodes.length) await tx.knowledgeNode.createMany({ data: backup.data.knowledgeNodes.map((item) => ({ ...item, nextReviewAt: optionalDate(item.nextReviewAt), lastReviewAt: optionalDate(item.lastReviewAt), createdAt: date(item.createdAt) })) });
      if (backup.data.relations.length) await tx.knowledgeNodeRelation.createMany({ data: backup.data.relations });
      if (backup.data.mistakes.length) await tx.mistakeItem.createMany({ data: backup.data.mistakes.map((item) => ({ ...item, createdAt: date(item.createdAt), reviewedAt: optionalDate(item.reviewedAt) })) });
      if (backup.data.sessions.length) await tx.studySession.createMany({ data: backup.data.sessions.map((item) => ({ ...item, date: date(item.date) })) });
      if (backup.data.tasks.length) await tx.task.createMany({ data: backup.data.tasks.map((item) => ({ ...item, date: date(item.date), createdAt: date(item.createdAt) })) });
      if (backup.data.reviews.length) await tx.dailyReview.createMany({ data: backup.data.reviews.map((item) => ({ ...item, date: date(item.date), createdAt: date(item.createdAt) })) });
      if (backup.data.resources.length) await tx.resource.createMany({ data: backup.data.resources.map((item) => ({ ...item, createdAt: date(item.createdAt) })) });
      for (const note of backup.data.notes) {
        await tx.note.create({
          data: {
            id: note.id,
            title: note.title,
            content: note.content,
            tags: note.tags,
            createdAt: date(note.createdAt),
            updatedAt: date(note.updatedAt),
            knowledgeNodes: { connect: note.knowledgeNodeIds.map((id) => ({ id })) },
          },
        });
      }
    }, { timeout: 30_000 });

    return NextResponse.json({ ok: true, importedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Import backup failed:", error);
    return NextResponse.json({ error: "导入失败，原数据未被替换" }, { status: 500 });
  }
}
