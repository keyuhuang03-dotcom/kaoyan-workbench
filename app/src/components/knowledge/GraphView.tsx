"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Network, DataSet } from "vis-network/standalone";
import type { Edge as VisEdge } from "vis-network";
import "vis-network/styles/vis-network.css";
import {
  Search, GitGraph, ListTree, X, Star,
  BookOpen, AlertTriangle, Sparkles, Edit3, Loader2, Plus, Trash2,
  Focus, RotateCcw,
} from "lucide-react";

// ===== Types =====
interface RelatedMistake { id: string; title: string; reviewStatus: string; }
interface RelatedNote { id: string; title: string; }
interface RelatedRelation {
  id: string;
  nodeId: string;
  nodeName: string;
  label: string;
  direction: "outgoing" | "incoming";
}
interface KnowledgeNodeData {
  id: string; label: string; level: number; depth: number;
  group: string; subjectId: string;
  status: string; tags: string | null;
  pageStart: number | null; pageEnd: number | null;
  description: string | null; lastReviewAt: string | null;
  nextReviewAt: string | null;
  chapterName: string | null;
  mistakeCount: number;
  relatedMistakes: RelatedMistake[];
  relatedNotes: RelatedNote[];
  relatedRelations: RelatedRelation[];
}

interface AiCandidate {
  name: string;
  subject: string;
  notes: string;
  parent: string;
  related: string[];
  existingId: string | null;
  selected: boolean;
}

interface EdgeData {
  id?: string; from: string; to: string; type: string; label?: string | null;
}

// ===== Status config =====
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  unlearned:        { label: "未学习",   color: "#9ca3af", bg: "#f3f4f6" },
  learning:         { label: "学习中",   color: "#60a5fa", bg: "#eff6ff" },
  mastered:         { label: "已掌握",   color: "#34d399", bg: "#ecfdf5" },
  keypoint:         { label: "重点知识", color: "#fbbf24", bg: "#fffbeb" },
  frequent_mistake: { label: "高频错题", color: "#f87171", bg: "#fef2f2" },
};

const depthSizes = [40, 32, 26, 20, 16];

const subjectColors: Record<string, string> = {
  "数学": "#6366f1",
  "英语": "#0ea5e9",
  "政治": "#f43f5e",
  "408": "#8b5cf6",
};

function getNodeColor(status: string): string {
  return statusConfig[status]?.color || "#9ca3af";
}

function getNodeBg(status: string): string {
  return statusConfig[status]?.bg || "#f3f4f6";
}

// ===== Component =====
export default function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [allNodes, setAllNodes] = useState<KnowledgeNodeData[]>([]);
  const [allEdges, setAllEdges] = useState<EdgeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [viewMode, setViewMode] = useState<"graph" | "tree" | "timeline">("graph");

  // Top bar state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [searchResults, setSearchResults] = useState<KnowledgeNodeData[]>([]);

  // Edit modal
  const [editingNode, setEditingNode] = useState<KnowledgeNodeData | null>(null);
  const [editName, setEditName] = useState("");
  const [editLevel, setEditLevel] = useState(0);
  const [editStatus, setEditStatus] = useState("unlearned");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // AI
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [relationTargetId, setRelationTargetId] = useState("");
  const [relationLabel, setRelationLabel] = useState("related");
  const [relationSaving, setRelationSaving] = useState(false);
  const [relationError, setRelationError] = useState("");
  const [graphReady, setGraphReady] = useState(false);

  // AI add node
  const [showAiAdd, setShowAiAdd] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiPreview, setAiPreview] = useState<AiCandidate[]>([]);
  const [aiAdded, setAiAdded] = useState(0);
  const [aiError, setAiError] = useState("");

  // ===== AI extract new nodes =====
  const handleAiExtract = async () => {
    if (!aiInput.trim()) return;
    setAiExtracting(true);
    setAiPreview([]);
    setAiAdded(0);
    setAiError("");
    try {
      const res = await fetch("/api/ai/extract-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: aiInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 提取失败");
      if (data.nodes && data.nodes.length > 0) {
        setAiPreview(data.nodes.map((node: Omit<AiCandidate, "selected">) => ({
          ...node,
          selected: !node.existingId,
        })));
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI 提取失败");
    }
    setAiExtracting(false);
  };

  const handleAddAiNodes = async () => {
    let added = 0;
    setAiError("");
    for (const node of aiPreview.filter((candidate) => candidate.selected && !candidate.existingId)) {
      try {
        const response = await fetch("/api/knowledge/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: node.name,
            subject: node.subject,
            description: node.notes,
            parentName: node.parent,
            relatedNames: node.related,
            status: "unlearned",
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "添加失败");
        if (result.created) added++;
      } catch (error) {
        setAiError(error instanceof Error ? error.message : "部分知识点添加失败");
      }
    }
    setAiAdded(added);
    if (added > 0) {
      setAiPreview([]);
      setAiInput("");
      await fetchGraph();
    }
  };

  // ===== Data loading =====
  async function fetchGraph() {
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      const nodes: KnowledgeNodeData[] = data.nodes || [];
      const edges: EdgeData[] = data.edges || [];
      setAllNodes(nodes);
      setAllEdges(edges);
      buildGraph(nodes, edges);
    } catch (err) { console.error(err); setLoading(false); }
  }

  const buildGraph = useCallback((nodes: KnowledgeNodeData[], edges: EdgeData[]) => {
    if (!containerRef.current) { setLoading(false); return; }
    if (networkRef.current) networkRef.current.destroy();

    if (!nodes.length) { setLoading(false); return; }

    // Filter by subject and status
    let filtered = subjectFilter === "all"
      ? nodes
      : nodes.filter((n) => n.group === subjectFilter);

    filtered = statusFilter === "all"
      ? filtered
      : filtered.filter((n) => n.status === statusFilter);

    const nodeIds = new Set(filtered.map((n) => n.id));
    const filteredEdges = edges.filter(
      (e) => nodeIds.has(e.from) && nodeIds.has(e.to)
    );

    setGraphReady(false);
    const visNodes = new DataSet(
      filtered.map((n: KnowledgeNodeData) => {
        const size = depthSizes[Math.min(n.depth, depthSizes.length - 1)];
        const statusColor = getNodeColor(n.status);
        return {
          id: n.id,
          label: n.label,
          group: n.group,
          size,
          font: {
            size: Math.max(11, 15 - n.depth),
            face: "SF Pro Display, -apple-system, sans-serif",
            color: "#1f2937",
            multi: false,
          },
          color: {
            background: getNodeBg(n.status),
            border: statusColor,
            hover: { background: "#ffffff", border: statusColor },
            highlight: { background: "#ffffff", border: statusColor },
          },
          borderWidth: n.status === "keypoint" || n.status === "frequent_mistake" ? 2.5 : 1.5,
          borderWidthSelected: 4,
          shape: "box",
          margin: { top: 10, right: 14, bottom: 10, left: 14 },
          shadow: { enabled: true, color: "rgba(15, 23, 42, 0.10)", size: 10, x: 0, y: 4 },
          shapeProperties: { borderRadius: 12 },
          title: `${n.label}\n${"★".repeat(n.level)}${"☆".repeat(5 - n.level)}\n${statusConfig[n.status]?.label || n.status}\n错题: ${n.mistakeCount}`,
        };
      })
    );

    const visEdges = new DataSet<VisEdge>(
      filteredEdges.map((e) => ({
        from: e.from,
        to: e.to,
        color: e.type === "weak" ? { color: "#fb7185", opacity: 0.75, highlight: "#f43f5e", hover: "#f43f5e" }
              : e.type === "related" ? { color: "#94a3b8", opacity: 0.35, highlight: "#64748b", hover: "#64748b" }
              : { color: "#a5b4fc", opacity: 0.55, highlight: "#6366f1", hover: "#6366f1" },
        width: e.type === "weak" ? 2.5 : 1.25,
        dashes: e.type === "related" ? [4, 4] : false,
        smooth: { enabled: true, type: "continuous", roundness: 0.5 },
      }))
    );

    const options = {
      physics: {
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 150,
          springConstant: 0.05,
          damping: 0.4,
        },
        maxVelocity: 20,
        solver: "forceAtlas2Based" as const,
        stabilization: { iterations: 150 },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
        navigationButtons: false,
        keyboard: { enabled: window.innerWidth >= 768 },
      },
      layout: { improvedLayout: true, hierarchical: viewMode === "tree" ? { enabled: true, direction: "UD" as const, sortMethod: "directed" as const } : false },
      edges: { arrows: { to: { enabled: viewMode === "tree", scaleFactor: 0.5 } } },
    };

    const network = new Network(
      containerRef.current,
      { nodes: visNodes, edges: visEdges },
      options
    );

    network.on("click", (p: { nodes: string[] }) => {
      if (p.nodes.length > 0) {
        const node = filtered.find((n) => n.id === p.nodes[0]);
        setSelectedNode(node || null);
        setShowPanel(true);
      } else {
        setSelectedNode(null);
        setShowPanel(false);
      }
    });

    network.on("doubleClick", (p: { nodes: string[] }) => {
      if (p.nodes.length > 0) {
        const node = filtered.find((n) => n.id === p.nodes[0]);
        if (node) {
          setEditingNode(node);
          setEditName(node.label);
          setEditLevel(node.level);
          setEditStatus(node.status);
          setEditDescription(node.description || "");
        }
      }
    });

    network.on("stabilizationIterationsDone", () => {
      setLoading(false);
      setGraphReady(true);
      network.fit({ animation: { duration: 450, easingFunction: "easeInOutQuad" } });
      if (window.innerWidth < 768) {
        window.setTimeout(() => {
          if (networkRef.current !== network) return;
          try {
            const currentScale = network.getScale();
            if (currentScale < 0.68) {
              network.moveTo({ scale: 0.68, animation: { duration: 300, easingFunction: "easeInOutQuad" } });
            }
          } catch {
            // The graph may have been rebuilt while the fit animation was running.
          }
        }, 480);
      }
    });

    networkRef.current = network;
    setTimeout(() => setLoading(false), 1500);
  }, [statusFilter, subjectFilter, viewMode]);

  const fitGraph = () => {
    networkRef.current?.fit({ animation: { duration: 450, easingFunction: "easeInOutQuad" } });
  };

  useEffect(() => { void fetchGraph(); }, []);

  // Rebuild on filter/view change
  useEffect(() => {
    if (allNodes.length === 0) return;
    buildGraph(allNodes, allEdges);
  }, [statusFilter, subjectFilter, viewMode, buildGraph, allNodes, allEdges]);

  // ===== Search =====
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const results = allNodes.filter(
      (n) => n.label.toLowerCase().includes(q.toLowerCase())
    );
    setSearchResults(results.slice(0, 8));
  };

  const focusNode = (nodeId: string) => {
    if (networkRef.current) {
      networkRef.current.focus(nodeId, { scale: 1.5, animation: true });
      networkRef.current.selectNodes([nodeId]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  // ===== Editor =====
  const openEditor = (node: KnowledgeNodeData) => {
    setEditingNode(node);
    setEditName(node.label);
    setEditLevel(node.level);
    setEditStatus(node.status);
    setEditDescription(node.description || "");
  };

  const saveNode = async () => {
    if (!editingNode || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/knowledge/${editingNode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          masteryLevel: editLevel,
          status: editStatus,
          description: editDescription,
        }),
      });
      if (res.ok) {
        setEditingNode(null);
        await fetchGraph();
        setShowPanel(false);
      }
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  // ===== AI =====
  const handleAiGenerate = async (mode: "summary" | "advice") => {
    if (!selectedNode) return;
    setAiGenerating(true);
    setAiResult("");
    try {
      const res = await fetch("/api/ai/knowledge-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: selectedNode.id, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 分析失败");
      setAiResult(data.advice || "AI 分析完成");
    } catch {
      setAiResult("AI 服务暂时不可用");
    }
    setAiGenerating(false);
  };

  const relationLabelText: Record<string, string> = {
    related: "相关",
    prerequisite: "前置",
    confusable: "易混淆",
  };

  async function addRelation() {
    if (!selectedNode || !relationTargetId || relationSaving) return;
    setRelationSaving(true);
    setRelationError("");
    try {
      const response = await fetch("/api/knowledge/relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: selectedNode.id, targetId: relationTargetId, label: relationLabel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "添加失败");
      const target = allNodes.find((node) => node.id === relationTargetId);
      if (data.created && target) {
        setSelectedNode((current) => current ? {
          ...current,
          relatedRelations: [...current.relatedRelations, {
            id: data.relation.id,
            nodeId: target.id,
            nodeName: target.label,
            label: relationLabel,
            direction: "outgoing",
          }],
        } : current);
        await fetchGraph();
      }
      setRelationTargetId("");
    } catch (error) {
      setRelationError(error instanceof Error ? error.message : "添加关系失败");
    } finally {
      setRelationSaving(false);
    }
  }

  async function deleteRelation(relationId: string) {
    if (relationSaving) return;
    setRelationSaving(true);
    setRelationError("");
    try {
      const response = await fetch("/api/knowledge/relations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "删除失败");
      setSelectedNode((current) => current ? {
        ...current,
        relatedRelations: current.relatedRelations.filter((relation) => relation.id !== relationId),
      } : current);
      await fetchGraph();
    } catch (error) {
      setRelationError(error instanceof Error ? error.message : "删除关系失败");
    } finally {
      setRelationSaving(false);
    }
  }

  // ===== Filters =====
  const filterOptions = [
    { value: "all", label: "全部" },
    { value: "unlearned", label: "未学习" },
    { value: "learning", label: "学习中" },
    { value: "mastered", label: "已掌握" },
    { value: "frequent_mistake", label: "高频错题" },
    { value: "keypoint", label: "重点" },
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-2rem)] pt-12 md:pt-0 md:h-[calc(100vh-4rem)]">
      {/* Top Bar */}
      <div className="shrink-0 space-y-2.5 mb-3 md:mb-4 px-1">
        {/* Row 1: search + view mode + AI */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜索知识点..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {searchResults.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => focusNode(n.id)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getNodeColor(n.status) }} />
                    {n.label}
                    <span className="text-xs text-[var(--muted-foreground)] ml-auto">{n.group}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-0.5 bg-[var(--muted)] rounded-xl p-1 flex-shrink-0 border border-[var(--card-border)]">
            <button
              onClick={() => setViewMode("graph")}
              className={`p-2 rounded-lg transition-all ${viewMode === "graph" ? "bg-[var(--card)] text-indigo-600 shadow-sm" : "text-[var(--muted-foreground)]"}`}
              title="图谱模式"
            >
              <GitGraph size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`p-2 rounded-lg transition-all ${viewMode === "tree" ? "bg-[var(--card)] text-indigo-600 shadow-sm" : "text-[var(--muted-foreground)]"}`}
              title="树状模式"
            >
              <ListTree size={16} strokeWidth={1.5} />
            </button>
          </div>

          <button
            onClick={() => setShowAiAdd(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/20 transition-all flex-shrink-0"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">AI 添加</span>
          </button>
        </div>

        {/* Row 2: Subject filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {[
            { value: "all", label: "全部" },
            { value: "数学", label: "数学" },
            { value: "英语", label: "英语" },
            { value: "政治", label: "政治" },
            { value: "408", label: "408" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSubjectFilter(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium flex-shrink-0 flex items-center gap-1.5 ${
                subjectFilter === opt.value
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                  : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-indigo-300"
              }`}
            >
              {opt.value !== "all" && <span className="w-1.5 h-1.5 rounded-full" style={{ background: subjectColors[opt.value] }} />}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Row 3: Status filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`text-xs px-2.5 py-1.5 rounded-full transition-all flex-shrink-0 flex items-center gap-1.5 ${
                statusFilter === opt.value
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {opt.value !== "all" && <span className="w-1.5 h-1.5 rounded-full" style={{ background: getNodeColor(opt.value) }} />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main area: graph + panel */}
      <div className="flex-1 flex gap-0 relative min-h-0" style={{ overflow: "hidden" }}>
        {/* Graph */}
        <div
          className={`knowledge-graph-canvas flex-1 relative rounded-2xl border border-indigo-100/80 bg-white transition-all shadow-[0_18px_60px_rgba(15,23,42,0.06)] ${showPanel ? "md:mr-[360px]" : ""}`}
          style={{ overflow: "hidden" }}
        >
          {loading && (
            <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-white/75 backdrop-blur-sm z-10">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span className="text-xs text-slate-500">正在整理知识脉络…</span>
            </div>
          )}
          <div ref={containerRef} className="absolute inset-0" />

          <div className={`absolute left-3 top-3 md:left-4 md:top-4 z-[2] pointer-events-none transition-opacity ${graphReady ? "opacity-100" : "opacity-0"}`}>
            <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-md">
              <p className="text-[11px] font-semibold text-slate-700">{allNodes.length} 个知识点</p>
              <p className="text-[10px] text-slate-400 mt-0.5">拖动探索 · 双击编辑</p>
            </div>
          </div>

          <div className="absolute right-3 top-3 md:right-4 md:top-4 z-[2] flex flex-col gap-2">
            <button onClick={fitGraph} title="居中显示" className="w-9 h-9 rounded-xl border border-white/80 bg-white/85 text-slate-600 shadow-sm backdrop-blur-md flex items-center justify-center hover:text-indigo-600 hover:shadow-md transition-all">
              <Focus size={16} />
            </button>
            <button onClick={() => buildGraph(allNodes, allEdges)} title="重新排布" className="w-9 h-9 rounded-xl border border-white/80 bg-white/85 text-slate-600 shadow-sm backdrop-blur-md flex items-center justify-center hover:text-indigo-600 hover:shadow-md transition-all">
              <RotateCcw size={15} />
            </button>
          </div>

          <div className="absolute left-3 bottom-3 md:left-4 md:bottom-4 z-[2] hidden sm:flex items-center gap-3 rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-md pointer-events-none">
            {["learning", "mastered", "keypoint", "frequent_mistake"].map((status) => (
              <span key={status} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-2 h-2 rounded-full" style={{ background: getNodeColor(status) }} />
                {statusConfig[status].label}
              </span>
            ))}
          </div>
        </div>

        {/* Right panel */}
        {showPanel && selectedNode && (
          <div className="fixed md:absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 w-full md:w-[360px] max-h-[78vh] md:max-h-none rounded-t-2xl md:rounded-none bg-[var(--card)] border-t md:border-t-0 md:border-l border-[var(--card-border)] z-40 overflow-y-auto shadow-2xl md:shadow-none flex flex-col animate-slide-up md:animate-none safe-bottom">
            {/* Panel header */}
            <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--card-border)] p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">{selectedNode.label}</h2>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i <= selectedNode.level ? getNodeColor(selectedNode.status) : "none"}
                        color={i <= selectedNode.level ? getNodeColor(selectedNode.status) : "#d1d5db"}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: getNodeBg(selectedNode.status), color: getNodeColor(selectedNode.status) }}
                    >
                      {statusConfig[selectedNode.status]?.label || selectedNode.status}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">{selectedNode.group}</span>
                    {selectedNode.chapterName && (
                      <span className="text-xs text-[var(--muted-foreground)]">{selectedNode.chapterName}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setShowPanel(false); setSelectedNode(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
              <button
                onClick={() => openEditor(selectedNode)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--muted)] transition-colors"
              >
                <Edit3 size={12} />
                编辑知识节点
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 p-4 space-y-5">
              {/* 我的理解 */}
              <section>
                <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">我的理解</h3>
                <div className="text-sm text-[var(--foreground)] leading-relaxed bg-[var(--muted)] rounded-lg p-3 min-h-[60px]">
                  {selectedNode.description || (
                    <span className="text-[var(--muted-foreground)] italic">暂无笔记，双击节点添加理解...</span>
                  )}
                </div>
                {selectedNode.pageStart && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    教材页码：P{selectedNode.pageStart}{selectedNode.pageEnd ? `-${selectedNode.pageEnd}` : ""}
                  </p>
                )}
              </section>

              {/* 知识关系 */}
              <section>
                <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <GitGraph size={12} />知识关系
                </h3>
                {selectedNode.relatedRelations.length > 0 ? (
                  <div className="space-y-1.5 mb-3">
                    {selectedNode.relatedRelations.map((relation) => (
                      <div key={relation.id} className="flex items-center gap-2 rounded-lg bg-[var(--muted)] px-3 py-2 text-xs">
                        <span className="text-[var(--muted-foreground)]">
                          {relation.direction === "incoming" && relation.label === "prerequisite" ? "依赖于此" : relationLabelText[relation.label] || "相关"}
                        </span>
                        <span className="flex-1 truncate">{relation.nodeName}</span>
                        <button
                          onClick={() => deleteRelation(relation.id)}
                          disabled={relationSaving}
                          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-50 hover:text-red-500"
                          aria-label={`删除与 ${relation.nodeName} 的关系`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)] mb-3">暂无知识关系</p>
                )}
                <div className="space-y-2">
                  <select
                    value={relationTargetId}
                    onChange={(event) => setRelationTargetId(event.target.value)}
                    className="w-full text-xs bg-[var(--muted)] rounded-lg px-2.5 py-2 border border-[var(--card-border)] outline-none"
                  >
                    <option value="">选择另一个知识点</option>
                    {allNodes.filter((node) => node.id !== selectedNode.id).map((node) => (
                      <option key={node.id} value={node.id}>{node.group} · {node.label}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <select
                      value={relationLabel}
                      onChange={(event) => setRelationLabel(event.target.value)}
                      className="flex-1 text-xs bg-[var(--muted)] rounded-lg px-2.5 py-2 border border-[var(--card-border)] outline-none"
                    >
                      <option value="related">相关</option>
                      <option value="prerequisite">前置知识</option>
                      <option value="confusable">易混淆</option>
                    </select>
                    <button
                      onClick={addRelation}
                      disabled={!relationTargetId || relationSaving}
                      className="btn btn-secondary text-xs gap-1 px-3 disabled:opacity-50"
                    >
                      {relationSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}添加
                    </button>
                  </div>
                  {relationError && <p className="text-xs text-red-500">{relationError}</p>}
                </div>
              </section>

              {/* 相关错题 */}
              <section>
                <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  相关错题
                  {selectedNode.mistakeCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">{selectedNode.mistakeCount}</span>
                  )}
                </h3>
                {selectedNode.relatedMistakes.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedNode.relatedMistakes.map((m) => (
                      <a
                        key={m.id}
                        href={`/wrong-questions`}
                        className="block text-sm px-3 py-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--foreground)]"
                      >
                        {m.title}
                        <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-full ${
                          m.reviewStatus === "mastered" ? "bg-green-50 text-green-500" : "bg-amber-50 text-amber-500"
                        }`}>
                          {m.reviewStatus === "mastered" ? "已掌握" : "待复习"}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)]">暂无相关错题</p>
                )}
              </section>

              {/* 关联笔记 */}
              <section>
                <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <BookOpen size={12} />
                  关联笔记
                </h3>
                {selectedNode.relatedNotes.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedNode.relatedNotes.map((note) => (
                      <a
                        key={note.id}
                        href={`/notes`}
                        className="block text-sm px-3 py-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--foreground)]"
                      >
                        {note.title}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)]">暂无关联笔记</p>
                )}
              </section>

              {/* AI 分析 */}
              <section>
                <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Sparkles size={12} />
                  AI 分析
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleAiGenerate("summary")}
                    disabled={aiGenerating}
                    className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--card)] border border-[var(--card-border)] transition-colors"
                  >
                    {aiGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    生成知识总结
                  </button>
                  <button
                    onClick={() => handleAiGenerate("advice")}
                    disabled={aiGenerating}
                    className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--card)] border border-[var(--card-border)] transition-colors"
                  >
                    {aiGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    生成学习建议
                  </button>
                  {aiResult && (
                    <div className="text-xs text-[var(--foreground)] bg-blue-50 rounded-lg p-3 leading-relaxed">
                      {aiResult}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingNode && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/30" onClick={() => setEditingNode(null)} />
          <div className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[480px] z-[90] card shadow-2xl">
            <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
              <h3 className="text-sm font-semibold">编辑知识节点</h3>
              <button onClick={() => setEditingNode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)]">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">名称</label>
                <input
                  type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">掌握等级</label>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map((l) => (
                    <button
                      key={l}
                      onClick={() => setEditLevel(l)}
                      className={`text-lg ${l <= editLevel ? "text-amber-400" : "text-gray-200"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">学习状态</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)]"
                >
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">我的理解</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  placeholder="记录你对这个知识点的理解..."
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingNode(null)} className="btn btn-secondary text-sm">取消</button>
                <button onClick={saveNode} disabled={saving} className="btn btn-primary text-sm gap-1.5">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  保存
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* AI add modal */}
      {showAiAdd && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/30" onClick={() => setShowAiAdd(false)} />
          <div className="fixed inset-x-4 top-[8%] bottom-4 md:bottom-auto md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[520px] z-[90] card shadow-2xl overflow-y-auto">
            <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles size={14} />
                AI 提取新知识点
              </h3>
              <button onClick={() => setShowAiAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)]">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="粘贴你最近的学习内容、笔记或教材章节名，AI 会自动提取其中的知识点..."
                rows={4}
                className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] resize-none"
              />

              <button
                onClick={handleAiExtract}
                disabled={aiExtracting || !aiInput.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--foreground)] text-[var(--background)] text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {aiExtracting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {aiExtracting ? "提取中..." : "AI 分析提取"}
              </button>

              {aiPreview.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    请确认后再写入；已存在的同名节点会自动跳过。
                  </p>
                  <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                    {aiPreview.map((node, i) => (
                      <div key={`${node.name}-${i}`} className="rounded-lg bg-[var(--muted)] p-3 text-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={node.selected}
                            disabled={Boolean(node.existingId)}
                            onChange={(event) => setAiPreview((items) => items.map((item, index) =>
                              index === i ? { ...item, selected: event.target.checked } : item
                            ))}
                            aria-label={`选择 ${node.name}`}
                          />
                          <input
                            value={node.name}
                            disabled={Boolean(node.existingId)}
                            onChange={(event) => setAiPreview((items) => items.map((item, index) =>
                              index === i ? { ...item, name: event.target.value } : item
                            ))}
                            className="min-w-0 flex-1 bg-transparent font-medium outline-none"
                          />
                          <select
                            value={node.subject}
                            disabled={Boolean(node.existingId)}
                            onChange={(event) => setAiPreview((items) => items.map((item, index) =>
                              index === i ? { ...item, subject: event.target.value } : item
                            ))}
                            className="bg-transparent text-xs text-[var(--muted-foreground)] outline-none"
                          >
                            {["数学", "英语", "408", "政治"].map((subject) => (
                              <option key={subject}>{subject}</option>
                            ))}
                          </select>
                        </div>
                        {node.existingId ? (
                          <div className="text-xs text-amber-600">图谱中已存在，将跳过</div>
                        ) : (
                          <>
                            <textarea
                              value={node.notes}
                              onChange={(event) => setAiPreview((items) => items.map((item, index) =>
                                index === i ? { ...item, notes: event.target.value } : item
                              ))}
                              rows={2}
                              placeholder="知识点说明"
                              className="w-full bg-[var(--card)] rounded-md px-2 py-1.5 text-xs outline-none resize-none"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                value={node.parent}
                                onChange={(event) => setAiPreview((items) => items.map((item, index) =>
                                  index === i ? { ...item, parent: event.target.value } : item
                                ))}
                                placeholder="上位知识点（可选）"
                                className="bg-[var(--card)] rounded-md px-2 py-1.5 text-xs outline-none"
                              />
                              <input
                                value={node.related.join("、")}
                                onChange={(event) => setAiPreview((items) => items.map((item, index) =>
                                  index === i ? { ...item, related: event.target.value.split(/[、,，]/).map((v) => v.trim()).filter(Boolean) } : item
                                ))}
                                placeholder="相关知识点，用顿号分隔"
                                className="bg-[var(--card)] rounded-md px-2 py-1.5 text-xs outline-none"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleAddAiNodes}
                    disabled={!aiPreview.some((node) => node.selected && !node.existingId)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500 text-white text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    确认添加选中的知识点
                  </button>
                </div>
              )}

              {aiError && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{aiError}</div>
              )}

              {aiAdded > 0 && (
                <div className="text-sm text-green-600 text-center">
                  ✅ 已添加 {aiAdded} 个知识点
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
