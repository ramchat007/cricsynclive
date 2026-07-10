"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

import RichTextEditor from "../../components/RichTextEditor";

export default function BlogAdmin() {
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
  });
  const [status, setStatus] = useState("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");

    const { error } = await supabase.from("blogs").insert([formData]);

    if (error) {
      alert("Error saving blog: " + error.message);
    } else {
      setFormData({ title: "", slug: "", excerpt: "", content: "" });
      alert("Blog published successfully!");
    }
    setStatus("idle");
  };

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setFormData({ ...formData, title, slug });
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-black mb-8 text-[var(--foreground)]">
        Publish New Article
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-[var(--surface-1)] p-8 rounded-3xl border border-[var(--border-1)]"
      >
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
            Article Title
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={handleTitleChange}
            className="w-full p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)]"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
            URL Slug
          </label>
          <input
            type="text"
            required
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] font-mono text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
            Short Excerpt (For Homepage)
          </label>
          <textarea
            required
            rows={2}
            value={formData.excerpt}
            onChange={(e) =>
              setFormData({ ...formData, excerpt: e.target.value })
            }
            className="w-full p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)]"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
            Full Content (HTML/Text)
          </label>
          <RichTextEditor 
            content={formData.content}
            onChange={(html) => setFormData({ ...formData, content: html })}
          />
        </div>

        <button
          type="submit"
          disabled={status === "saving"}
          className="bg-[var(--accent)] text-[var(--background)] px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:opacity-90"
        >
          {status === "saving" ? "Publishing..." : "Publish Article"}
        </button>
      </form>
    </div>
  );
}
