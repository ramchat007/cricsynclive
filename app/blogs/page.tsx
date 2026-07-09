import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

// Initialize Supabase (Make sure to use your actual env variables)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// This is a Next.js Server Component
export default async function BlogsListingPage() {
  // Fetch all blogs from your database
  const { data: blogs, error } = await supabase
    .from("blogs")
    .select("id, title, slug, excerpt, created_at")
    .order("created_at", { ascending: false }); // Show newest first

  if (error) {
    return <div>Error loading blogs.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-black italic uppercase mb-8 text-[var(--foreground)]">
        Tournament <span className="text-[var(--accent)]">Insights</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs?.map((blog) => (
          <Link
            key={blog.id}
            href={`/blogs/${blog.slug}`}
            className="bg-[var(--background)]/[0.7] backdrop-blur-2xl border border-[var(--foreground)]/10 p-6 rounded-[2rem] hover:-translate-y-2 hover:shadow-xl transition-all">
            <h2 className="text-xl font-bold mb-3">{blog.title}</h2>
            <p className="text-[var(--text-muted)] text-sm mb-4 line-clamp-3">
              {blog.excerpt}
            </p>
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
              Read More →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
