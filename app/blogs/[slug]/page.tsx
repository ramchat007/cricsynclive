import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  const { data: blog } = await supabase
    .from("blogs")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!blog) notFound();

  return (
    <article className="max-w-3xl mx-auto p-4 md:p-8 pt-24 min-h-screen">
      <header className="mb-12 text-center">
        <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-4 block">
          {new Date(blog.created_at).toLocaleDateString()}
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-[var(--foreground)] mb-6 leading-tight">
          {blog.title}
        </h1>
      </header>

      {/* Render the raw HTML saved from the admin panel safely */}
      <div
        className="prose dark:prose-invert prose-teal max-w-none text-[var(--text-muted)] text-lg leading-loose"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />
    </article>
  );
}
