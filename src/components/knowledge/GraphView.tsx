"use client";

import { useEffect, useRef, useState } from "react";
import { Network, DataSet } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import {
  GitGraph, X, Search, Save, BookOpen,
  FileText, Loader2, Star, AlertTriangle, Plus,
  Edit3, Link2, Sparkles,
} from "lucide-react";

// ===== Types =====
interface RelatedMistake { id: string; title: string; reviewStatus: string; }
interface RelatedNote { id: string; title: string; }
interface KnowledgeNodeData {
  id: string; label: string; level: number; group: string;
  status: string; tags: string | null;
  pageStart: number | null; pageEnd: number | null;
  description: string | null; lastReviewAt: string | null;
  chapterName: string | null;
  relatedMistakes: RelatedMistake[];
  relatedNotes: RelatedNote[];
}

// ===== Status helpers =====
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  unlearned:        { label: "未学习",   color: "#e8e3db", bg: "#f5f2ec" },
  learning:         { label: "学习中",   color: "#bcc8d4", bg: "#eef2f6" },
  mastered:         { label: "已掌握",   color: "#a8bfb4", bg: "#eaf0ed" },
  keypoint:         { label: "重点知识", color: "#c0b8cc", bg: "#f0eef4" },
  frequent_mistake: { label: "高频错题", color: "#d4c4b8", bg: "#f7f2ee" },
};

// Mastery star colors
function getNodeColor(level: number): string {
  const colors = ["#e8e3db", "#cdd5ce", "#bcc8d4", "#a8b5c4", "#c0b8cc", "#a8bfb4"];
  return colors[Math.min(level, 5)] || colors[0];
}

// ===== Component =====
export default function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [allNodes, setAllNodes] = useState<KnowledgeNodeData[]>([]);
  const [allEdges, setAllEdges] = useState<{ from: string; to: string }[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);

  // Edit modal state
  const [editingNode, setEditingNode] = useState<KnowledgeNodeData | null>(null);
  const [editName, setEditName] = useState("");
  const [editLevel, setEditLevel] = useState(0);
  const [editStatus, setEditStatus] = useState("unlearned");
  const [editPageStart, setEditPageStart] = useState("");
  const [editPageEnd, setEditPageEnd] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline description editing
  const [editingDescription, setEditingDescription] = useState(false);
  const [inlineDesc, setInlineDesc] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeNodeData[]>([]);

  // Subject filter
  const [subjectFilter, setSubjectFilter] = useState("all");
  const subjects = [...new Set(allNodes.map((n) => n.group))];

  // Link note
  const [showLinkNote, setShowLinkNote] = useState(false);
  const [availableNotes, setAvailableNotes] = useState<RelatedNote[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);

  // New node modal
  const [showNewNode, setShowNewNode] = useState(false);
  const [newNodeMode, setNewNodeMode] = useState<"manual" | "ai">("manual");
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [newLevel, setNewLevel] = useState(0);
  const [newStatus, setNewStatus] = useState("unlearned");
  const [aiInput, setAiInput] = useState("");
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiPreview, setAiPreview] = useState<{ name: string; subject: string; notes: string }[]>([]);
  const [newNodeSaving, setNewNodeSaving] = useState(false);

  // ===== Data loading =====
  useEffect(() => { fetchGraph(); }, []);

  // Rebuild graph when subject filter changes
  useEffect(() => {
    if (allNodes.length === 0) return;
    const filtered = allNodes.filter(n => subjectFilter === "all" || n.group === subjectFilter);
    buildGraph(filtered);
  }, [subjectFilter]);

  const fetchGraph = async () => {
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setAllNodes(data.nodes || []);
      setAllEdges(data.edges || []);
      const filtered = data.nodes?.filter((n: KnowledgeNodeData) => subjectFilter === "all" || n.group === subjectFilter) || [];
      buildGraph(filtered);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const buildGraph = (filteredNodes: KnowledgeNodeData[]) => {
    if (!containerRef.current) { setLoading(false); return; }
    if (networkRef.current) networkRef.current.destroy();

    if (!filteredNodes.length) { setLoading(false); return; }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = allEdges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));

    const visNodes = new DataSet(
      filteredNodes.map((n: KnowledgeNodeData) => ({
        id: n.id, label: n.label, group: n.group,
        value: (n.level + 1) * 10,
        font: { size: 12, face: "SF Pro Display, -apple-system, sans-serif",
          color: getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim() },
        color: {
          background: getNodeColor(n.level),
          border: n.status === "keypoint" || n.status === "frequent_mistake" ? getNodeColor(n.level) : "transparent",
          highlight: { background: getNodeColor(Math.min(n.level + 1, 5)), border: "transparent" },
        },
        borderWidth: n.status === "keypoint" ? 3 : n.status === "frequent_mistake" ? 2 : 0,
      }))
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visEdges = new DataSet(
      (filteredEdges.map((e) => ({ from: e.from, to: e.to, color: { color: "#c4bfb4", opacity: 0.5 }, width: 1, smooth: { type: "continuous" } })) as any)
    );

    const isMobile = window.innerWidth < 768;
    const options = {
      physics: {
        forceAtlas2Based: { gravitationalConstant: -40, centralGravity: 0.005, springLength: isMobile ? 120 : 180, springConstant: 0.08 },
        maxVelocity: 30, solver: "forceAtlas2Based" as const, stabilization: { iterations: 200 },
      },
      interaction: { hover: true, tooltipDelay: 100, zoomView: true, dragView: true },
      layout: { improvedLayout: true },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const network = new Network(containerRef.current, { nodes: visNodes as any, edges: visEdges as any }, options);

    network.on("click", (p) => {
      if (p.nodes.length > 0) {
        const node = filteredNodes.find((n) => n.id === p.nodes[0]);
        setSelectedNode(node || null); setShowPanel(true);
      }
    });

    network.on("doubleClick", (p) => {
      if (p.nodes.length > 0) {
        const node = filteredNodes.find((n) => n.id === p.nodes[0]);
        if (node) openEditor(node);
      }
    });

    networkRef.current = network;
    setLoading(false);
  };

  // ===== Editor =====
  const openEditor = (node: KnowledgeNodeData) => {
    setEditingNode(node); setEditName(node.label); setEditLevel(node.level);
    setEditStatus(node.status); setEditPageStart(node.pageStart?.toString() || "");
    setEditPageEnd(node.pageEnd?.toString() || ""); setEditDescription(node.description || "");
    setEditTags(node.tags || "");
  };

  const saveNode = async () => {
    if (!editingNode || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/knowledge/${editingNode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName, masteryLevel: editLevel, status: editStatus,
          pageStart: editPageStart ? parseInt(editPageStart) : null,
          pageEnd: editPageEnd ? parseInt(editPageEnd) : null,
          description: editDescription, tags: editTags || null,
        }),
      });
      if (res.ok) { setEditingNode(null); setLoading(true); networkRef.current?.destroy(); await fetchGraph(); }
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  // Inline description save
  const saveDescription = async () => {
    if (!selectedNode) return;
    await fetch(`/api/knowledge/${selectedNode.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: inlineDesc }),
    });
    setSelectedNode({ ...selectedNode, description: inlineDesc });
    setEditingDescription(false);
  };

  // ===== Search =====
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const lower = q.toLowerCase();
    setSearchResults(
      allNodes.filter(n =>
        n.label.toLowerCase().includes(lower) ||
        n.group.toLowerCase().includes(lower) ||
        (n.tags && n.tags.toLowerCase().includes(lower))
      ).slice(0, 8)
    );
  };

  const focusNode = (nodeId: string) => {
    networkRef.current?.focus(nodeId, { scale: 1.5, animation: { duration: 500, easingFunction: "easeInOutQuad" } });
    networkRef.current?.selectNodes([nodeId]);
    setSearchResults([]); setSearchQuery("");
  };

  // ===== New node =====
  const handleAiExtract = async () => {
    if (!aiInput.trim() || aiExtracting) return;
    setAiExtracting(true);
    try {
      const analyzeRes = await fetch("/api/ai/extract-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: aiInput }),
      });
      const extractData = await analyzeRes.json();
      if (extractData.nodes && extractData.nodes.length > 0) {
        setAiPreview(extractData.nodes);
      }
    } catch (err) {
      console.error("AI extract failed:", err);
    }
    setAiExtracting(false);
  };

  const handleAddAiNodes = async () => {
    if (aiPreview.length === 0 || newNodeSaving) return;
    setNewNodeSaving(true);
    try {
      for (const node of aiPreview) {
        // Find the subject ID
        const matchedSubject = subjects.find(s => s === node.subject || subjects.some(sub => sub.toLowerCase() === node.subject?.toLowerCase()))
          ? node.subject
          : subjects[0];
        await fetch("/api/knowledge/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: node.name,
            subject: matchedSubject,
            description: node.notes,
            status: "unlearned",
            masteryLevel: 0,
          }),
        });
      }
      setShowNewNode(false);
      setAiPreview([]);
      setAiInput("");
      // Refresh graph
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setAllNodes(data.nodes || []);
      setAllEdges(data.edges || []);
      const filtered = data.nodes?.filter((n: KnowledgeNodeData) => subjectFilter === "all" || n.group === subjectFilter) || [];
      buildGraph(filtered);
    } catch (err) {
      console.error("Add AI nodes failed:", err);
    }
    setNewNodeSaving(false);
  };

  const handleManualAdd = async () => {
    if (!newName.trim() || !newSubject || newNodeSaving) return;
    setNewNodeSaving(true);
    try {
      await fetch("/api/knowledge/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          subject: newSubject,
          parentId: newParentId || null,
          masteryLevel: newLevel,
          status: newStatus,
        }),
      });
      setShowNewNode(false);
      setNewName("");
      setNewSubject("");
      setNewParentId("");
      // Refresh graph
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setAllNodes(data.nodes || []);
      setAllEdges(data.edges || []);
      const filtered = data.nodes?.filter((n: KnowledgeNodeData) => subjectFilter === "all" || n.group === subjectFilter) || [];
      buildGraph(filtered);
    } catch (err) {
      console.error("Add node failed:", err);
    }
    setNewNodeSaving(false);
  };
  const fetchAvailableNotes = async () => {
    setLinkLoading(true);
    const res = await fetch("/api/notes");
    const notes = await res.json();
    setAvailableNotes(notes);
    setShowLinkNote(true);
    setLinkLoading(false);
  };

  const linkNote = async (noteId: string) => {
    if (!selectedNode) return;
    await fetch(`/api/knowledge/${selectedNode.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    // Refresh
    const res = await fetch("/api/knowledge");
    const data = await res.json();
    const updated = data.nodes.find((n: KnowledgeNodeData) => n.id === selectedNode.id);
    setSelectedNode(updated);
    setShowLinkNote(false);
  };

  const unlinkNote = async (noteId: string) => {
    if (!selectedNode) return;
    await fetch(`/api/knowledge/${selectedNode.id}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    const res = await fetch("/api/knowledge");
    const data = await res.json();
    setSelectedNode(data.nodes.find((n: KnowledgeNodeData) => n.id === selectedNode.id));
  };

  // ===== Render =====
  const st = selectedNode && statusConfig[selectedNode.status];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <GitGraph size={22} strokeWidth={1.5} />知识图谱
        </h1>
        <span className="text-[11px] text-[var(--muted-foreground)] hidden md:block">
          单击查看 · 双击编辑 · 滚轮缩放
        </span>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text" value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && searchResults.length > 0) focusNode(searchResults[0].id); }}
            placeholder="搜索知识点..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[var(--card)] border border-[var(--card-border)] text-sm outline-none focus:border-[var(--foreground)] transition-colors min-h-[44px]"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 z-30 card shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((n) => (
                <button key={n.id} onClick={() => focusNode(n.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors text-left">
                  <span>{n.label}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">{n.group}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => { if (searchResults.length > 0) focusNode(searchResults[0].id); }}
          className="btn btn-secondary text-sm px-4 flex-shrink-0"
        >
          <Search size={16} />
        </button>
        <button
          onClick={() => { setShowNewNode(true); setNewNodeMode("manual"); }}
          className="btn btn-primary text-sm gap-1.5 flex-shrink-0"
        >
          <Plus size={14} />新增
        </button>
      </div>

      {/* Subject filter tabs */}
      {subjects.length > 1 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setSubjectFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors touch-manipulation flex-shrink-0
              ${subjectFilter === "all" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}
          >
            全部
          </button>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSubjectFilter(sub)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors touch-manipulation flex-shrink-0
                ${subjectFilter === sub ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Graph + detail layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Graph canvas */}
        <div className="lg:col-span-3 card relative" style={{ height: "calc(100vh - 260px)", minHeight: "400px" }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-[var(--muted-foreground)] text-sm">Loading...</div>
          ) : (
            <>
              <div ref={containerRef} className="h-full w-full rounded-lg touch-pan-x touch-pan-y" />
              <div className="absolute bottom-3 left-3 text-[10px] text-[var(--muted-foreground)] bg-[var(--card)]/80 rounded-lg px-2 py-1">双击节点编辑</div>
            </>
          )}
        </div>

        {/* Detail panel */}
        <div className="card p-5 h-fit lg:sticky lg:top-4 space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto">
          {selectedNode ? (
            <>
              {/* Name + status */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold">{selectedNode.label}</h3>
                  {st && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}` }}>
                      {st.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {selectedNode.group}{selectedNode.chapterName ? ` · ${selectedNode.chapterName}` : ""}
                </p>
              </div>

              {/* Mastery stars */}
              <div>
                <div className="text-[10px] text-[var(--muted-foreground)] mb-1">掌握程度</div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={14} strokeWidth={1.5}
                      className={i <= selectedNode.level ? "fill-current" : "text-[var(--card-border)]"}
                      style={{ color: i <= selectedNode.level ? getNodeColor(selectedNode.level) : undefined }}
                    />
                  ))}
                </div>
              </div>

              {/* Pages */}
              {(selectedNode.pageStart || selectedNode.pageEnd) && (
                <div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mb-1 flex items-center gap-1.5">
                    <BookOpen size={12} />教材页码
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {selectedNode.pageStart && `P${selectedNode.pageStart}`}
                    {selectedNode.pageStart && selectedNode.pageEnd && ` - `}
                    {selectedNode.pageEnd && `P${selectedNode.pageEnd}`}
                  </p>
                </div>
              )}

              {/* Tags */}
              {selectedNode.tags && (
                <div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mb-1">标签</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.tags.split(",").map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{t.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Last review */}
              {selectedNode.lastReviewAt && (
                <div className="text-[10px] text-[var(--muted-foreground)]">
                  最近学习：{new Date(selectedNode.lastReviewAt).toLocaleDateString("zh-CN")}
                </div>
              )}

              {/* Description (editable inline) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Edit3 size={11} />我的理解
                  </span>
                  {!editingDescription && (
                    <button onClick={() => { setInlineDesc(selectedNode.description || ""); setEditingDescription(true); }}
                      className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      {selectedNode.description ? "编辑" : "添加"}
                    </button>
                  )}
                </div>
                {editingDescription ? (
                  <div className="space-y-2">
                    <textarea value={inlineDesc} onChange={(e) => setInlineDesc(e.target.value)}
                      placeholder="记录自己的理解、易错点、公式..."
                      rows={4}
                      className="w-full text-xs bg-[var(--muted)] rounded-lg px-3 py-2 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] resize-none"
                      autoFocus />
                    <div className="flex gap-2">
                      <button onClick={saveDescription} className="btn btn-primary text-[11px] py-1 px-3">保存</button>
                      <button onClick={() => setEditingDescription(false)} className="btn btn-secondary text-[11px] py-1 px-3">取消</button>
                    </div>
                  </div>
                ) : selectedNode.description ? (
                  <p className="text-xs text-[var(--muted-foreground)] whitespace-pre-wrap leading-relaxed">{selectedNode.description}</p>
                ) : (
                  <p className="text-[10px] text-[var(--muted-foreground)] italic">暂无理解笔记</p>
                )}
              </div>

              {/* Related mistakes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <AlertTriangle size={11} />相关错题 ({selectedNode.relatedMistakes.length})
                  </span>
                </div>
                {selectedNode.relatedMistakes.length > 0 ? (
                  <div className="space-y-1">
                    {selectedNode.relatedMistakes.map((m) => (
                      <a key={m.id} href={`/wrong-questions`}
                        className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] no-underline">
                        <span className="w-1 h-1 rounded-full" style={{ background: m.reviewStatus === "mastered" ? "#a8bfb4" : "#d4c4b8" }} />
                        {m.title}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-[var(--muted-foreground)] italic">暂无关联错题</p>
                )}
              </div>

              {/* Related notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <FileText size={11} />相关笔记 ({selectedNode.relatedNotes.length})
                  </span>
                  <button onClick={fetchAvailableNotes}
                    className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-0.5">
                    <Plus size={11} />关联
                  </button>
                </div>
                {selectedNode.relatedNotes.length > 0 ? (
                  <div className="space-y-1">
                    {selectedNode.relatedNotes.map((n) => (
                      <div key={n.id} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-[var(--muted)] transition-colors group">
                        <a href={`/notes`} className="text-[var(--muted-foreground)] no-underline flex-1 truncate">{n.title}</a>
                        <button onClick={() => unlinkNote(n.id)}
                          className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--card-border)] transition-opacity">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-[var(--muted-foreground)] italic">暂无关联笔记</p>
                )}
              </div>

              {/* Edit button */}
              <button onClick={() => openEditor(selectedNode)}
                className="btn btn-secondary text-xs w-full gap-1.5">
                <Edit3 size={12} />编辑节点
              </button>
            </>
          ) : (
            <div className="text-sm text-[var(--muted-foreground)] text-center py-8">
              点击图谱节点<br/>查看详细信息
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail (bottom sheet) */}
      {showPanel && selectedNode && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowPanel(false)} />
          <div className="relative card rounded-t-2xl p-5 pb-8 shadow-2xl safe-bottom animate-slide-up max-h-[75vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--muted-foreground)]">知识点详情</span>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowPanel(false); openEditor(selectedNode); }} className="text-xs px-2 py-1 rounded hover:bg-[var(--muted)]">编辑</button>
                <button onClick={() => setShowPanel(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)]"><X size={16} /></button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{selectedNode.label}</h3>
                {st && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{selectedNode.group}{selectedNode.chapterName ? ` · ${selectedNode.chapterName}` : ""}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted-foreground)]">掌握程度</span>
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={13} strokeWidth={1.5}
                    className={i <= selectedNode.level ? "fill-current" : "text-[var(--card-border)]"}
                    style={{ color: i <= selectedNode.level ? getNodeColor(selectedNode.level) : undefined }} />
                ))}
              </div>
            </div>

            {(selectedNode.pageStart || selectedNode.pageEnd) && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <BookOpen size={12} />
                {selectedNode.pageStart && `P${selectedNode.pageStart}`}
                {selectedNode.pageStart && selectedNode.pageEnd && " - "}
                {selectedNode.pageEnd && `P${selectedNode.pageEnd}`}
              </div>
            )}

            {selectedNode.description && (
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)]">我的理解</span>
                <p className="text-xs whitespace-pre-wrap leading-relaxed mt-1">{selectedNode.description}</p>
              </div>
            )}

            <button onClick={() => { setShowPanel(false); openEditor(selectedNode); }}
              className="btn btn-secondary text-xs w-full">编辑节点</button>
          </div>
        </div>
      )}

      {/* ===== Edit Modal ===== */}
      {editingNode && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setEditingNode(null)} />
          <div className="fixed inset-x-4 top-[5%] max-h-[90vh] overflow-y-auto md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[520px] z-50 card flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
              <h2 className="text-sm font-semibold flex items-center gap-2"><Edit3 size={14} />编辑知识节点</h2>
              <button onClick={() => setEditingNode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)]"><X size={16} /></button>
            </div>

            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">名称</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)]" />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">学习状态</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <button key={key} onClick={() => setEditStatus(key)}
                      className="text-xs px-3 py-1.5 rounded-full transition-colors"
                      style={{ background: key === editStatus ? cfg.color : "var(--muted)", color: key === editStatus ? "#fff" : "var(--muted-foreground)" }}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mastery */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">掌握程度</label>
                <div className="flex items-center gap-2">
                  {[0,1,2,3,4,5].map(i => (
                    <button key={i} onClick={() => setEditLevel(i)}
                      className="w-9 h-9 rounded-full text-xs font-medium transition-colors"
                      style={{ background: i === editLevel ? getNodeColor(i) : "var(--muted)", color: i === editLevel ? "#fff" : "var(--muted-foreground)" }}>
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pages */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1 block">起始页</label>
                  <input type="number" value={editPageStart} onChange={e => setEditPageStart(e.target.value)}
                    placeholder="如: 145"
                    className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)]" />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1 block">结束页</label>
                  <input type="number" value={editPageEnd} onChange={e => setEditPageEnd(e.target.value)}
                    placeholder="如: 152"
                    className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)]" />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">标签（逗号分隔）</label>
                <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)}
                  placeholder="如: 重点, 易错, 408"
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)]" />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 flex items-center gap-1.5"><FileText size={12} />我的理解</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
                  placeholder="记录自己的理解、易错点、公式、总结..."
                  rows={5}
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] resize-none" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--card-border)]">
              <button onClick={() => setEditingNode(null)} className="btn btn-secondary text-sm">取消</button>
              <button onClick={saveNode} disabled={saving} className="btn btn-primary text-sm gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== Link note modal ===== */}
      {showLinkNote && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setShowLinkNote(false)} />
          <div className="fixed inset-x-4 top-[20%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px] z-50 card flex flex-col shadow-2xl max-h-[60vh]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
              <h3 className="text-sm font-semibold">关联笔记</h3>
              <button onClick={() => setShowLinkNote(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)]"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto p-2">
              {linkLoading ? (
                <div className="p-4 text-center text-sm text-[var(--muted-foreground)]">加载中...</div>
              ) : availableNotes.length === 0 ? (
                <div className="p-4 text-center text-sm text-[var(--muted-foreground)]">暂无笔记</div>
              ) : (
                availableNotes.filter(n => !selectedNode?.relatedNotes.find(rn => rn.id === n.id)).map(n => (
                  <button key={n.id} onClick={() => linkNote(n.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-[var(--muted)] transition-colors text-left">
                    <Link2 size={14} strokeWidth={1.5} className="text-[var(--muted-foreground)]" />
                    {n.title}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== New node modal ===== */}
      {showNewNode && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setShowNewNode(false)} />
          <div className="fixed inset-x-4 top-[5%] max-h-[90vh] overflow-y-auto md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[520px] z-50 card flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNewNodeMode("manual")}
                  className={`text-sm px-3 py-1 rounded-lg transition-colors ${newNodeMode === "manual" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted-foreground)]"}`}
                >
                  手动添加
                </button>
                <button
                  onClick={() => setNewNodeMode("ai")}
                  className={`text-sm px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${newNodeMode === "ai" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted-foreground)]"}`}
                >
                  <Sparkles size={12} />AI 智能新增
                </button>
              </div>
              <button onClick={() => setShowNewNode(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)]"><X size={16} /></button>
            </div>

            {newNodeMode === "manual" ? (
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1 block">知识点名称</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="如: 极限的定义"
                    className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)]" />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1 block">科目</label>
                  <select value={newSubject} onChange={e => setNewSubject(e.target.value)}
                    className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] min-h-[40px]">
                    <option value="">选择科目</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1 block">父节点（可选）</label>
                  <select value={newParentId} onChange={e => setNewParentId(e.target.value)}
                    className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] min-h-[40px]">
                    <option value="">无（顶级节点）</option>
                    {allNodes.filter(n => !newSubject || n.group === newSubject).map(n => <option key={n.id} value={n.id}>{n.label} ({n.group})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1 block">初始掌握度</label>
                  <div className="flex items-center gap-2">
                    {[0,1,2,3,4,5].map(i => (
                      <button key={i} onClick={() => setNewLevel(i)}
                        className="w-8 h-8 rounded-full text-xs font-medium transition-colors"
                        style={{ background: i === newLevel ? getNodeColor(i) : "var(--muted)", color: i === newLevel ? "#fff" : "var(--muted-foreground)" }}>{i}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1 block">学习状态</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                      <button key={key} onClick={() => setNewStatus(key)}
                        className="text-xs px-3 py-1.5 rounded-full transition-colors"
                        style={{ background: key === newStatus ? cfg.color : "var(--muted)", color: key === newStatus ? "#fff" : "var(--muted-foreground)" }}>{cfg.label}</button>
                    ))}
                  </div>
                </div>
                <button onClick={handleManualAdd} disabled={newNodeSaving || !newName.trim() || !newSubject}
                  className="btn btn-primary text-sm w-full gap-1.5" style={{ opacity: newNodeSaving || !newName.trim() || !newSubject ? 0.5 : 1 }}>
                  <Save size={14} />{newNodeSaving ? "保存中..." : "添加知识点"}
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1 block">输入学习内容，AI 自动提取知识点</label>
                  <textarea value={aiInput} onChange={e => setAiInput(e.target.value)}
                    placeholder="粘贴你的学习笔记、课本段落或总结，AI 将自动识别并提取知识点..."
                    rows={6}
                    className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] resize-none" />
                </div>
                <button onClick={handleAiExtract} disabled={aiExtracting || !aiInput.trim()}
                  className="btn btn-primary text-sm w-full gap-1.5" style={{ opacity: aiExtracting || !aiInput.trim() ? 0.5 : 1 }}>
                  {aiExtracting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {aiExtracting ? "分析中..." : "AI 提取知识点"}
                </button>

                {aiPreview.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[var(--card-border)]">
                    <div className="text-xs text-[var(--muted-foreground)]">AI 识别到 {aiPreview.length} 个知识点：</div>
                    {aiPreview.map((node, i) => (
                      <div key={i} className="card p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{node.name}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full">{node.subject}</span>
                        </div>
                        {node.notes && <p className="text-xs text-[var(--muted-foreground)] mt-1">{node.notes}</p>}
                      </div>
                    ))}
                    <button onClick={handleAddAiNodes} disabled={newNodeSaving}
                      className="btn btn-primary text-sm w-full gap-1.5">
                      <Plus size={14} />{newNodeSaving ? "添加中..." : `一键添加 ${aiPreview.length} 个知识点`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
