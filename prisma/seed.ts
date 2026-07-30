import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear all user data
  await prisma.studySession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.mistakeItem.deleteMany();
  await prisma.dailyReview.deleteMany();
  await prisma.note.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.knowledgeNodeRelation.deleteMany();
  await prisma.knowledgeNode.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();

  // Create user
  const user = await prisma.user.create({
    data: { id: "default", name: "hky", examDate: new Date("2027-12-25") },
  });

  // Create 4 subjects
  const subjects = [
    { id: "math", name: "数学", color: "#bcc8d4", targetScore: 120 },
    { id: "english", name: "英语", color: "#d4c4b8", targetScore: 70 },
    { id: "cs", name: "408", color: "#a8bfb4", targetScore: 110 },
    { id: "politics", name: "政治", color: "#c4bcc8", targetScore: 65 },
  ];

  for (const s of subjects) {
    await prisma.subject.create({ data: s });
  }

  // Helper: sequential small batches
  async function batchCreate(nodes: { subjectId: string; parentId?: string; name: string }[]) {
    for (const n of nodes) {
      await prisma.knowledgeNode.create({ data: n });
    }
  }

  // ===== 数学 knowledge nodes =====
  const mathRoot = await prisma.knowledgeNode.create({
    data: { subjectId: "math", name: "高等数学", masteryLevel: 0, status: "unlearned" },
  });
  const mathLinear = await prisma.knowledgeNode.create({
    data: { subjectId: "math", name: "线性代数", masteryLevel: 0, status: "unlearned" },
  });
  const mathProb = await prisma.knowledgeNode.create({
    data: { subjectId: "math", name: "概率论", masteryLevel: 0, status: "unlearned" },
  });

  await batchCreate([
    { subjectId: "math", parentId: mathRoot.id, name: "极限与连续" },
    { subjectId: "math", parentId: mathRoot.id, name: "导数与微分" },
    { subjectId: "math", parentId: mathRoot.id, name: "不定积分" },
    { subjectId: "math", parentId: mathRoot.id, name: "定积分" },
    { subjectId: "math", parentId: mathRoot.id, name: "微分方程" },
    { subjectId: "math", parentId: mathLinear.id, name: "行列式" },
    { subjectId: "math", parentId: mathLinear.id, name: "矩阵" },
    { subjectId: "math", parentId: mathLinear.id, name: "向量" },
    { subjectId: "math", parentId: mathProb.id, name: "随机事件" },
    { subjectId: "math", parentId: mathProb.id, name: "分布函数" },
    { subjectId: "math", parentId: mathProb.id, name: "期望与方差" },
  ]);

  // ===== 408 knowledge nodes =====
  const csRoot = await prisma.knowledgeNode.create({
    data: { subjectId: "cs", name: "计算机408", masteryLevel: 0, status: "unlearned" },
  });
  const ds = await prisma.knowledgeNode.create({
    data: { subjectId: "cs", parentId: csRoot.id, name: "数据结构" },
  });
  const co = await prisma.knowledgeNode.create({
    data: { subjectId: "cs", parentId: csRoot.id, name: "计算机组成原理" },
  });
  const os = await prisma.knowledgeNode.create({
    data: { subjectId: "cs", parentId: csRoot.id, name: "操作系统" },
  });
  const cn = await prisma.knowledgeNode.create({
    data: { subjectId: "cs", parentId: csRoot.id, name: "计算机网络" },
  });

  await batchCreate([
    { subjectId: "cs", parentId: ds.id, name: "链表" },
    { subjectId: "cs", parentId: ds.id, name: "栈与队列" },
    { subjectId: "cs", parentId: ds.id, name: "树与二叉树" },
    { subjectId: "cs", parentId: ds.id, name: "图" },
    { subjectId: "cs", parentId: ds.id, name: "查找算法" },
    { subjectId: "cs", parentId: ds.id, name: "排序算法" },
    { subjectId: "cs", parentId: co.id, name: "数据表示" },
    { subjectId: "cs", parentId: co.id, name: "存储系统" },
    { subjectId: "cs", parentId: co.id, name: "指令系统" },
    { subjectId: "cs", parentId: co.id, name: "CPU与流水线" },
    { subjectId: "cs", parentId: os.id, name: "进程管理" },
    { subjectId: "cs", parentId: os.id, name: "内存管理" },
    { subjectId: "cs", parentId: os.id, name: "文件系统" },
    { subjectId: "cs", parentId: cn.id, name: "物理层" },
    { subjectId: "cs", parentId: cn.id, name: "数据链路层" },
    { subjectId: "cs", parentId: cn.id, name: "网络层" },
    { subjectId: "cs", parentId: cn.id, name: "传输层" },
  ]);

  // ===== 英语 knowledge nodes =====
  const engRoot = await prisma.knowledgeNode.create({
    data: { subjectId: "english", name: "考研英语", masteryLevel: 0, status: "unlearned" },
  });
  await batchCreate([
    { subjectId: "english", parentId: engRoot.id, name: "词汇积累" },
    { subjectId: "english", parentId: engRoot.id, name: "阅读长难句" },
    { subjectId: "english", parentId: engRoot.id, name: "完形填空" },
    { subjectId: "english", parentId: engRoot.id, name: "翻译技巧" },
    { subjectId: "english", parentId: engRoot.id, name: "写作模板" },
    { subjectId: "english", parentId: engRoot.id, name: "新题型" },
  ]);

  // ===== 政治 knowledge nodes =====
  const polRoot = await prisma.knowledgeNode.create({
    data: { subjectId: "politics", name: "考研政治", masteryLevel: 0, status: "unlearned" },
  });
  await batchCreate([
    { subjectId: "politics", parentId: polRoot.id, name: "马原" },
    { subjectId: "politics", parentId: polRoot.id, name: "毛中特" },
    { subjectId: "politics", parentId: polRoot.id, name: "史纲" },
    { subjectId: "politics", parentId: polRoot.id, name: "思修法基" },
    { subjectId: "politics", parentId: polRoot.id, name: "时政" },
  ]);

  console.log("✅ Seed completed: 4 subjects, full knowledge trees");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
