import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://biosklbeesyohleiyyqz.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpb3NrbGJlZXN5b2hsZWl5eXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjYwMDEsImV4cCI6MjA5NzMwMjAwMX0.4FOQd93b5mcvtK-5CsRLp_cLzq9WVTXznNVga5oizX8';
const BASE_URL = 'https://carrot-td.lovable.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateSitemap() {
  console.log('Generating sitemap...');
  
  const staticRoutes = [
    '',
    '/chests',
    '/summons',
    '/units',
    '/maps',
    '/gamemodes',
    '/forum',
    '/loadouts',
    '/updates',
    '/daily-vault',
    '/feedback',
    '/settings',
    '/auth'
  ];

  const urls = [...staticRoutes];

  try {
    // Fetch units
    const { data: units } = await supabase.from('units').select('slug');
    if (units) units.forEach(u => urls.push(`/units/${u.slug}`));

    // Fetch summons
    const { data: summons } = await supabase.from('summons').select('slug');
    if (summons) summons.forEach(s => urls.push(`/summons/${s.slug}`));

    // Fetch chests
    const { data: chests } = await supabase.from('chests').select('slug');
    if (chests) chests.forEach(c => urls.push(`/chests/${c.slug}`));

    // Fetch maps
    const { data: maps } = await supabase.from('maps').select('slug');
    if (maps) maps.forEach(m => urls.push(`/maps/${m.slug}`));

    // Fetch forum posts
    const { data: posts } = await supabase.from('forum_posts').select('id');
    if (posts) posts.forEach(p => urls.push(`/forum/post/${p.id}`));

    // Fetch updates
    const { data: updates } = await supabase.from('updates').select('slug');
    if (updates) updates.forEach(u => urls.push(`/updates/${u.slug}`));

    // Fetch gamemodes
    const { data: gamemodes } = await supabase.from('gamemodes').select('slug');
    if (gamemodes) gamemodes.forEach(g => urls.push(`/gamemodes/${g.slug}`));

    // Fetch community loadouts
    const { data: loadouts } = await supabase.from('community_loadouts').select('id');
    if (loadouts) loadouts.forEach(l => urls.push(`/loadouts/community/${l.id}`));

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${BASE_URL}${url}</loc>
    <changefreq>daily</changefreq>
    <priority>${url === '' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
    console.log('Sitemap generated successfully in public/sitemap.xml');
  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

generateSitemap();
