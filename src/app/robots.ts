import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://shopmitra.in';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/merchant/settings', '/admin/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
