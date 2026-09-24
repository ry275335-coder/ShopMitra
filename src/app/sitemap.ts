import { MetadataRoute } from 'next';
import { dbClient } from '@/lib/supabase/db';

export const revalidate = 86400; // Cache sitemap for 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://shopmitra.in';

  const [productsRes, shopsRes] = await Promise.all([
    dbClient.from('products').select('slug').eq('is_active', true).limit(500),
    dbClient.from('shops').select('slug').eq('is_active', true).limit(500),
  ]);

  const products = productsRes.data || [];
  const shops = shopsRes.data || [];

  const productUrls: MetadataRoute.Sitemap = products.map(p => ({
    url: `${baseUrl}/product/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  const shopUrls: MetadataRoute.Sitemap = shops.map(s => ({
    url: `${baseUrl}/shop/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1.0,
    },
    ...productUrls,
    ...shopUrls,
  ];
}
