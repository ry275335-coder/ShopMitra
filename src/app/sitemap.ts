import { MetadataRoute } from 'next';
import { fetchDbProducts, fetchDbShops } from '@/lib/supabase/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://shopmitra.in';

  const [products, shops] = await Promise.all([
    fetchDbProducts(),
    fetchDbShops(),
  ]);

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
