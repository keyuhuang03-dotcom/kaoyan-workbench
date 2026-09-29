"use client";

import { useState, useEffect, useRef } from "react";
import { BookOpen, Plus, X, Trash2, Paperclip, FileText, Loader2, Sparkles } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  knowledgeNodes?: { id: string; name: string }[];
}

interface UploadedFile {
  url: string;
  name: string;
  type: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [aiNodeIds, setAiNodeIds] = useState<string[]>([]);
  const [aiNewNodes, setAiNewNodes] = useState<{ name: string; subject: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    }
    setLoading(false);
  }

  const openNewNote = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setTags([]);
    setAiTags([]);
    setAiNodeIds([]);
    setTagInput("");
    setAttachments([]);
    setShowEditor(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags ? note.tags.split(",").map((t) => t.trim()).filter(Boolean) : []);
    setAiTags([]);
    setAiNodeIds([]);
    setTagInput("");

    const imgRegex = /!\[.*?\]\((\/uploads\/[^)]+)\)/g;
    const parsed: UploadedFile[] = [];
    let match;
    while ((match = imgRegex.exec(note.content)) !== null) {
      parsed.push({ url: match[1], name: match[1].split("/").pop() || "", type: "image" });
    }
    setAttachments(parsed);
    setShowEditor(true);
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setAttachments((prev) => [...prev, data]);

          if (data.type.startsWith("image/")) {
            setContent((prev) => prev + `\n![${data.name}](${data.url})\n`);
          } else {
            setContent((prev) => prev + `\n📎 [${data.name}](${data.url})\n`);
          }
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCategorize = async () => {
    if (!title.trim() && !content.trim()) return;
    setCategorizing(true);
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `${title}\n${content}` }),
      });
      const data = await res.json();
      if (data.nodes && data.nodes.length > 0) {
        const names: string[] = data.nodes.map((n: { name: string }) => n.name);
        const ids: string[] = data.nodes.map((n: { id: string }) => n.id);
        setAiTags(names);
        setAiNodeIds(ids);
      }
      if (data.newNodes && data.newNodes.length > 0) {
        setAiNewNodes(data.newNodes);
      }
    } catch (err) {
      console.error("Categorize failed:", err);
    }
    setCategorizing(false);
  };

  const saveNote = async () => {
    if (!title.trim() && !content.trim()) return;
    setSaving(true);

    try {
      const url = editingNote ? `/api/notes/${editingNote.id}` : "/api/notes";
      const method = editingNote ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "未命名笔记",
          content: content.trim(),
          tags: tags.length > 0 ? tags.join(", ") : null,
          knowledgeNodeIds: aiNodeIds.length > 0 ? aiNodeIds : undefined,
        }),
      });

      if (res.ok) {
        await fetchNotes();
        setShowEditor(false);
      }
    } catch (err) {
      console.error("Failed to save note:", err);
    }
    setSaving(false);
  };

  const deleteNote = async (id: string) => {
    if (deletingNoteId || !confirm("确定删除这条笔记？删除后无法恢复。")) return false;
    setDeletingNoteId(id);
    try {
      const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("删除笔记失败");
      setNotes((prev) => prev.filter((n) => n.id !== id));
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除笔记失败，请重试");
      return false;
    } finally {
      setDeletingNoteId(null);
    }
  };

  const renderPreview = (text: string) => {
    const imgRegex = /!\[(.*?)\]\((\/uploads\/[^)]+)\)/g;
    const parts: { type: "text" | "image"; content: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = imgRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "image", content: match[2] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    if (parts.length === 0) return <p className="text-sm text-[var(--muted-foreground)]">空笔记</p>;

    return parts.map((part, i) => {
      if (part.type === "image") {
        return (
          <img
            key={i}
            src={part.content}
            alt=""
            className="rounded-lg max-h-48 object-cover mt-2"
            loading="lazy"
          />
        );
      }
      return (
        <p key={i} className="text-xs text-[var(--muted-foreground)] whitespace-pre-wrap">
          {part.content.replace(/📎 \[.*?\]\([^)]+\)/g, "").trim()}
        </p>
      );
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BookOpen size={22} strokeWidth={1.5} />
          笔记中心
        </h1>
        <button onClick={openNewNote} className="btn btn-primary text-sm gap-1.5">
          <Plus size={14} />
          <span className="hidden sm:inline">新建笔记</span>
        </button>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-[var(--muted-foreground)] text-sm">
          加载中...
        </div>
      ) : notes.length === 0 && !showEditor ? (
        <div className="card p-12 text-center text-[var(--muted-foreground)]">
          <BookOpen size={32} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无笔记</p>
          <p className="text-xs mt-1">点击右上角新建你的第一条笔记</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="card p-4 cursor-pointer group relative"
              onClick={() => openEditNote(note)}
            >
              <h3 className="text-sm font-semibold truncate pr-6">{note.title}</h3>
              <div className="mt-1 line-clamp-3">
                {note.content ? (
                  renderPreview(note.content)
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)] italic">空笔记</p>
                )}
              </div>
              {note.tags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {note.tags.split(",").map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              {note.knowledgeNodes && note.knowledgeNodes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {note.knowledgeNodes.map((kn) => (
                    <span
                      key={kn.id}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100"
                    >
                      📌 {kn.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-[10px] text-[var(--muted-foreground)] mt-2">
                {new Date(note.updatedAt).toLocaleDateString("zh-CN")}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNote(note.id);
                }}
                disabled={deletingNoteId === note.id}
                className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--card)]/90 text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all touch-manipulation shadow-sm md:shadow-none"
                aria-label={`删除笔记：${note.title}`}
              >
                {deletingNoteId === note.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} strokeWidth={1.5} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowEditor(false)}
          />
          <div className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] z-50 card flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
              <h2 className="text-sm font-semibold">
                {editingNote ? "编辑笔记" : "新建笔记"}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--card-border)]">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors touch-manipulation"
              >
                {uploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Paperclip size={14} strokeWidth={1.5} />
                )}
                {uploading ? "上传中..." : "上传文件"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="text-[10px] text-[var(--muted-foreground)] ml-1">
                {attachments.length > 0 && `${attachments.length} 个附件`}
              </span>
              <div className="flex-1" />
              <button
                onClick={handleCategorize}
                disabled={categorizing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors touch-manipulation"
              >
                {categorizing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} strokeWidth={1.5} />
                )}
                {categorizing ? "分析中..." : "AI 归类"}
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="笔记标题"
                className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-[var(--muted-foreground)]"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="开始记录...&#10;&#10;支持 Markdown 图片: ![描述](图片链接)"
                className="w-full flex-1 min-h-[200px] text-sm bg-transparent border-none outline-none resize-none placeholder:text-[var(--muted-foreground)] leading-relaxed"
                autoFocus
              />

              {/* Tags section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder="输入标签后按回车添加"
                    className="flex-1 text-xs bg-[var(--muted)] rounded-lg px-3 py-2 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] transition-colors placeholder:text-[var(--muted-foreground)]"
                  />
                </div>
                {(tags.length > 0 || aiTags.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"
                      >
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:opacity-70">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                    {aiTags
                      .filter((t) => !tags.includes(t))
                      .map((tag) => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          className="text-xs px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--card)] transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* AI 新建的知识点 */}
              {aiNewNodes.length > 0 && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-xs text-green-700 mb-1.5">✅ 已自动添加到知识图谱：</p>
                  <div className="flex flex-wrap gap-1">
                    {aiNewNodes.map((n, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {n.name}（{n.subject}）
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments preview */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] text-[var(--muted-foreground)]">附件预览</div>
                  <div className="grid grid-cols-3 gap-2">
                    {attachments.map((file, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden border border-[var(--card-border)] bg-[var(--muted)] aspect-square">
                        {file.type.startsWith("image/") ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                            <FileText size={20} strokeWidth={1} className="text-[var(--muted-foreground)]" />
                            <span className="text-[9px] text-[var(--muted-foreground)] text-center truncate w-full">
                              {file.name}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[var(--card-border)]">
              {editingNote && (
                <button
                  onClick={async () => {
                    if (await deleteNote(editingNote.id)) setShowEditor(false);
                  }}
                  disabled={deletingNoteId === editingNote.id}
                  className="min-h-11 px-3 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors touch-manipulation disabled:opacity-50"
                >
                  {deletingNoteId === editingNote.id ? "删除中..." : "删除笔记"}
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setShowEditor(false)} className="btn btn-secondary text-sm">
                  取消
                </button>
                <button
                  onClick={saveNote}
                  disabled={saving || (!title.trim() && !content.trim())}
                  className="btn btn-primary text-sm"
                  style={{ opacity: saving || (!title.trim() && !content.trim()) ? 0.5 : 1 }}
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
