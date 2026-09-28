import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { dbClient, fetchDbShops } from '@/lib/supabase/db';

interface ShopPageProps {
  params: { slug: string };
}

async function getShopBySlug(slug: string) {
  try {
    const { data, error } = await dbClient
      .from('shops')
      .select(`
        id, name, slug, phone, whatsapp, address, landmark, city,
        opening_hours, is_open, is_verified, verification_badge,
        logo_url, photos, rating, review_count, is_active
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (data && !error) {
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        phone: data.phone,
        whatsapp: data.whatsapp,
        address: data.address,
        landmark: data.landmark,
        city: data.city,
        openingHours: data.opening_hours,
        isOpen: data.is_open,
        isVerified: data.is_verified,
        verificationBadge: data.verification_badge || 'Verified Merchant',
        logoUrl: data.logo_url,
        photos: data.photos || [],
        rating: Number(data.rating) || 5.0,
        reviewCount: Number(data.review_count) || 0,
      };
    }
  } catch {}

  const allShops = await fetchDbShops();
  const found = allShops.find(s => s.slug === slug);
  if (found) {
    return {
      id: found.id,
      name: found.name,
      slug: found.slug,
      phone: found.phone,
      whatsapp: found.whatsapp,
      address: found.address,
      landmark: found.landmark,
      city: found.city,
      openingHours: found.openingHours,
      isOpen: found.isOpen,
      isVerified: found.isVerified,
      verificationBadge: found.verificationBadge,
      logoUrl: undefined,
      photos: found.photos || [],
      rating: found.rating,
      reviewCount: found.reviewCount,
    };
  }

  return null;
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const shop = await getShopBySlug(params.slug);
  if (!shop) {
    return {
      title: 'Store Not Found | ShopMitra',
      description: 'The requested store profile could not be located in our merchant network.',
    };
  }

  return {
    title: `${shop.name} - ${shop.city} Local Merchant | ShopMitra`,
    description: `Visit ${shop.name} at ${shop.address}, ${shop.city}. Verified local retail partner on ShopMitra. Live prices and counter availability.`,
    openGraph: {
      title: `${shop.name} - ShopMitra Partner`,
      description: `Physical retail outlet in ${shop.city}. Open ${shop.openingHours}.`,
      images: shop.photos?.[0] ? [{ url: shop.photos[0] }] : [],
    },
  };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const shop = await getShopBySlug(params.slug);

  if (!shop) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <nav className="mb-6 flex items-center space-x-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-emerald-600 transition-colors">Home</Link>
          <span>/</span>
          <span>Shops</span>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{shop.name}</span>
        </nav>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {shop.name}
                </h1>
                {shop.isVerified && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ✓ Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {shop.address}, {shop.city}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-lg font-black text-amber-500">★ {shop.rating.toFixed(1)}</span>
                <span className="text-xs text-slate-400 block">{shop.reviewCount} customer reviews</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Timings</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{shop.openingHours || '9:30 AM - 9:00 PM'}</p>
              <span className={`inline-block text-xs font-semibold ${shop.isOpen ? 'text-emerald-600' : 'text-rose-600'}`}>
                {shop.isOpen ? '● Currently Open' : '○ Currently Closed'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Contact</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{shop.phone}</p>
              {shop.whatsapp && (
                <span className="text-xs text-emerald-600 font-medium block">
                  WhatsApp: {shop.whatsapp}
                </span>
              )}
            </div>
          </div>

          <div className="pt-4">
            <Link
              href={`/?shop=${encodeURIComponent(shop.id)}`}
              className="inline-flex items-center justify-center w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all"
            >
              Explore Products Available at This Store
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
