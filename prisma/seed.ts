import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear all user data
  await prisma.studySession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.mistakeItem.deleteMany();
  await prisma.dailyReview.deleteMany();
  await prisma.note.deleteMany();
  await prisma.resource.deleteMany();

  // Reset knowledge nodes: all to level 0, status "unlearned", clear descriptions
  await prisma.knowledgeNode.updateMany({
    data: {
      masteryLevel: 0,
      status: "unlearned",
      description: null,
      pageStart: null,
      pageEnd: null,
      tags: null,
      lastReviewAt: null,
      nextReviewAt: null,
    },
  });

  // Ensure user exists
  await prisma.user.upsert({
    where: { id: "default" },
    update: { name: "hky", examDate: new Date("2026-12-26") },
    create: { id: "default", name: "hky", examDate: new Date("2026-12-26") },
  });

  console.log("✅ 数据已归零，可以开始正式使用！");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
