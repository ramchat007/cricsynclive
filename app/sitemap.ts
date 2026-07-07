import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Replace this with your actual live domain once deployed
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cricsynclive.in';

  // 1. Core Static Routes
  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/blogs',
    '/privacy',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. Dynamic Blog Routes
  const { data: blogs } = await supabase
    .from('blogs')
    .select('slug, created_at');

  const blogRoutes = (blogs || []).map((blog) => ({
    url: `${baseUrl}/blogs/${blog.slug}`,
    lastModified: new Date(blog.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // 3. Dynamic Tournament Routes
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, created_at');

  const tournamentRoutes = (tournaments || []).map((tournament) => ({
    url: `${baseUrl}/tournament/${tournament.id}`,
    lastModified: new Date(tournament.created_at),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  // 4. Dynamic Match Scorecard Routes
  // Limiting to the 1000 most recent matches to keep the sitemap generation fast
  const { data: matches } = await supabase
    .from('matches')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  const matchRoutes = (matches || []).map((match) => ({
    url: `${baseUrl}/match/${match.id}`,
    lastModified: new Date(match.created_at),
    // Tell Google these pages update frequently
    changeFrequency: 'always' as const, 
    priority: 0.9,
  }));

  // Combine and return all routes
  return [...staticRoutes, ...blogRoutes, ...tournamentRoutes, ...matchRoutes];
}