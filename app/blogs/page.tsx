import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const revalidate = 60;

export default async function BlogListing() {
  const { data: blogs } = await supabase
    .from("blogs")
    .select("title, slug, excerpt, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 pt-24 min-h-screen">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-[var(--foreground)] mb-4">
          CricSyncLive <span className="text-[var(--accent)]">Insights</span>
        </h1>
        <p className="text-[var(--text-muted)] font-medium max-w-2xl mx-auto">
          Guides, strategies, and updates for modern cricket tournament
          organizers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs?.map((blog) => (
          <Link
            key={blog.slug}
            href={`/blogs/${blog.slug}`}
            className="block group"
          >
            <div className="bg-[var(--surface-1)] p-6 rounded-3xl border border-[var(--border-1)] h-full transition-transform hover:-translate-y-1 hover:border-[var(--accent)]">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 block">
                {new Date(blog.created_at).toLocaleDateString()}
              </span>
              <h2 className="text-xl font-black text-[var(--foreground)] mb-3 group-hover:text-[var(--accent)] transition-colors">
                {blog.title}
              </h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {blog.excerpt}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
