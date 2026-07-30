"use client";

import { useState, useEffect, useRef } from "react";
import { BookOpen, Plus, X, Trash2, Paperclip, Image, FileText, Loader2, Sparkles } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
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
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    }
    setLoading(false);
  };

  const openNewNote = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setTags("");
    setAttachments([]);
    setShowEditor(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags || "");

    // Parse existing attachments from content
    const imgRegex = /!\[.*?\]\((\/uploads\/[^)]+)\)/g;
    const parsed: UploadedFile[] = [];
    let match;
    while ((match = imgRegex.exec(note.content)) !== null) {
      parsed.push({ url: match[1], name: match[1].split("/").pop() || "", type: "image" });
    }
    setAttachments(parsed);
    setShowEditor(true);
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

          // Auto-insert image markdown if it's an image
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
        const names = data.nodes.map((n: { name: string }) => n.name).join(", ");
        setTags((prev) => (prev ? prev + ", " + names : names));
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
          tags: tags.trim() || null,
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
    if (!confirm("确定删除这条笔记？")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Parse markdown images for preview
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
              <div className="text-[10px] text-[var(--muted-foreground)] mt-2">
                {new Date(note.updatedAt).toLocaleDateString("zh-CN")}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNote(note.id);
                }}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--muted)] transition-opacity"
                aria-label="删除"
              >
                <Trash2 size={13} strokeWidth={1.5} />
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
            {/* Header */}
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
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="标签（用逗号分隔）"
                className="w-full text-xs bg-[var(--muted)] rounded-lg px-3 py-2 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] transition-colors placeholder:text-[var(--muted-foreground)]"
              />

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
                  onClick={() => {
                    deleteNote(editingNote.id);
                    setShowEditor(false);
                  }}
                  className="text-xs text-red-500 hover:text-red-600 transition-colors"
                >
                  删除笔记
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
