import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
};

// --- DYNAMIC SEO METADATA ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const { data: blog } = await supabase
    .from("blogs")
    .select("title, excerpt")
    .eq("slug", slug)
    .single();

  if (!blog) {
    return { title: "Post Not Found | CricSyncLive" };
  }

  return {
    title: `${blog.title} | CricSyncLive Insights`,
    description:
      blog.excerpt ||
      "Read the latest insights and guides on cricket tournament management.",
    openGraph: {
      title: blog.title,
      description: blog.excerpt,
      type: "article",
    },
  };
}

// --- MAIN PAGE COMPONENT ---
export default async function BlogPost({ params }: Props) {
  const { slug } = await params;

  // 1. Fetch current blog
  const { data: blog } = await supabase
    .from("blogs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!blog) notFound();

  // 2. Fetch Previous Blog (The first one older than current)
  const { data: prevBlog } = await supabase
    .from("blogs")
    .select("title, slug")
    .lt("created_at", blog.created_at)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Fetch Next Blog (The first one newer than current)
  const { data: nextBlog } = await supabase
    .from("blogs")
    .select("title, slug")
    .gt("created_at", blog.created_at)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <article className="max-w-3xl mx-auto p-4 md:p-8 pt-24 min-h-screen">
      {/* --- TOP NAVIGATION: BACK BUTTON --- */}
      <Link
        href="/blogs"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-10 group">
        <ArrowLeft
          size={16}
          className="transition-transform group-hover:-translate-x-1"
        />
        Back to Insights
      </Link>

      {/* --- HEADER --- */}
      <header className="mb-12 text-center">
        <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-4 block">
          {new Date(blog.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-[var(--foreground)] mb-6 leading-tight">
          {blog.title}
        </h1>
      </header>

      {/* --- CONTENT --- */}
      <div
        className="prose dark:prose-invert prose-teal max-w-none text-[var(--text-muted)] text-lg leading-loose"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />

      {/* --- BOTTOM NAVIGATION: PREV / NEXT ARTICLES --- */}
      <div className="mt-20 pt-10 border-t border-[var(--foreground)]/10 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Previous Article Card */}
        {prevBlog ? (
          <Link
            href={`/blogs/${prevBlog.slug}`}
            className="group flex flex-col items-start p-6 rounded-2xl bg-[var(--background)]/[0.7] backdrop-blur-xl border border-[var(--foreground)]/10 hover:border-[var(--accent)]/50 transition-all hover:shadow-lg">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-1">
              <ArrowLeft
                size={12}
                className="transition-transform group-hover:-translate-x-1"
              />{" "}
              Previous
            </span>
            <span className="font-bold text-[var(--foreground)] line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
              {prevBlog.title}
            </span>
          </Link>
        ) : (
          <div /> /* Empty div to keep Next button aligned to the right if there is no Prev */
        )}

        {/* Next Article Card */}
        {nextBlog ? (
          <Link
            href={`/blogs/${nextBlog.slug}`}
            className="group flex flex-col items-end text-right p-6 rounded-2xl bg-[var(--background)]/[0.7] backdrop-blur-xl border border-[var(--foreground)]/10 hover:border-[var(--accent)]/50 transition-all hover:shadow-lg">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-1">
              Next{" "}
              <ArrowRight
                size={12}
                className="transition-transform group-hover:translate-x-1"
              />
            </span>
            <span className="font-bold text-[var(--foreground)] line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
              {nextBlog.title}
            </span>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </article>
  );
}
