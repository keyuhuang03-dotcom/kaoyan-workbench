import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const nodes = await prisma.knowledgeNode.findMany({
    include: {
      subject: true,
      chapter: true,
      children: true,
      mistakeItems: { select: { id: true, title: true, reviewStatus: true } },
      notes: { select: { id: true, title: true } },
    },
  });

  if (nodes.length === 0) {
    return NextResponse.json({ nodes: [], edges: [] });
  }

  const relations = await prisma.knowledgeNodeRelation.findMany();

  // Calculate depth for each node
  const depthMap = new Map<string, number>();
  function calcDepth(id: string, visiting = new Set<string>()): number {
    if (depthMap.has(id)) return depthMap.get(id)!;
    if (visiting.has(id)) {
      depthMap.set(id, 0);
      return 0;
    }
    visiting.add(id);
    const node = nodes.find((n) => n.id === id);
    if (!node?.parentId) {
      depthMap.set(id, 0);
      return 0;
    }
    const d = calcDepth(node.parentId, visiting) + 1;
    depthMap.set(id, d);
    return d;
  }
  nodes.forEach((n) => calcDepth(n.id));

  const outputNodes = nodes.map((n) => ({
    id: n.id,
    label: n.name,
    level: n.masteryLevel,
    depth: depthMap.get(n.id) || 0,
    group: n.subject.name,
    subjectId: n.subjectId,
    status: n.status,
    tags: n.tags,
    pageStart: n.pageStart,
    pageEnd: n.pageEnd,
    description: n.description,
    lastReviewAt: n.lastReviewAt,
    nextReviewAt: n.nextReviewAt,
    chapterName: n.chapter?.name || null,
    mistakeCount: n.mistakeItems.length,
    relatedMistakes: n.mistakeItems,
    relatedNotes: n.notes,
    relatedRelations: relations
      .filter((relation) => relation.sourceId === n.id || relation.targetId === n.id)
      .map((relation) => {
        const outgoing = relation.sourceId === n.id;
        const otherId = outgoing ? relation.targetId : relation.sourceId;
        return {
          id: relation.id,
          nodeId: otherId,
          nodeName: nodes.find((node) => node.id === otherId)?.name || "未知知识点",
          label: relation.label || "related",
          direction: outgoing ? "outgoing" : "incoming",
        };
      }),
  }));

  // Build edges: parent-child (dependency), related (relation), mistake-based (weak)
  const edges: { id?: string; from: string; to: string; type: string; label?: string | null }[] = [];

  // Parent-child = dependency edges
  for (const n of nodes) {
    if (n.parentId) {
      edges.push({ from: n.parentId, to: n.id, type: "dependency" });
    }
  }

  // KnowledgeNodeRelation = related edges
  for (const r of relations) {
    edges.push({ id: r.id, from: r.sourceId, to: r.targetId, type: "related", label: r.label });
  }

  // Nodes with mistakes have a "weak" connection to their parent
  for (const n of nodes) {
    if (n.mistakeItems.length > 0 && n.parentId) {
      // Add a highlighted edge for nodes with mistakes
      const existingEdge = edges.find(
        (e) => e.from === n.parentId && e.to === n.id
      );
      if (existingEdge && existingEdge.type === "dependency") {
        existingEdge.type = "weak"; // upgrade to weak
      }
    }
  }

  return NextResponse.json({ nodes: outputNodes, edges });
}
