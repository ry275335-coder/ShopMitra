import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { dbClient } from '@/lib/supabase/db';

export const revalidate = 300; // Cache product pages for 5 minutes

interface ProductPageProps {
  params: { slug: string };
}

const getProductBySlug = cache(async (slug: string) => {
  try {
    const { data, error } = await dbClient
      .from('products')
      .select(`
        id, name, slug, brand, model, description, mrp, image_url,
        categories (name)
      `)
      .eq('slug', slug)
      .maybeSingle();

    if (data && !error) {
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        brand: data.brand,
        model: data.model,
        description: data.description,
        mrp: Number(data.mrp),
        imageUrl: data.image_url,
        categoryName: (data.categories as any)?.name || 'General',
      };
    }
  } catch (err) {
    console.warn('getProductBySlug error:', err);
  }

  return null;
});

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) {
    return {
      title: 'Product Not Found | ShopMitra',
      description: 'The requested product could not be located in our local market catalog.',
    };
  }

  return {
    title: `${product.name} - Compare Local Market Rates | ShopMitra`,
    description: `Check live store rates and availability for ${product.name} by ${product.brand}. Compare physical retail prices nearby on ShopMitra.`,
    openGraph: {
      title: `${product.name} - ShopMitra Live Rates`,
      description: `Local physical store rates for ${product.name}. Max MRP ₹${product.mrp}.`,
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <nav className="mb-6 flex items-center space-x-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-emerald-600 transition-colors">Home</Link>
          <span>/</span>
          <span>Products</span>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{product.name}</span>
        </nav>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="aspect-square relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/60 dark:border-slate-800">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-slate-400 font-semibold">No Image Available</div>
            )}
          </div>

          <div className="space-y-4">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              {product.brand}
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {product.name}
            </h1>

            {product.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-4">
                {product.description}
              </p>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 block">Maximum Retail Price</span>
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                ₹{product.mrp.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="pt-4">
              <Link
                href={`/?q=${encodeURIComponent(product.name)}`}
                className="inline-flex items-center justify-center w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all"
              >
                Compare Local Store Rates Nearby
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
