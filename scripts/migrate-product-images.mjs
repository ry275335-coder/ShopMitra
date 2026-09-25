import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vhbhupmiwbwsaqeuziin.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

async function migrateProducts() {
  console.log('Fetching products with base64 images...');
  const { data: products, error } = await client.from('products').select('id, name, image_url');
  if (error || !products) {
    console.error('Failed to fetch products:', error);
    return;
  }

  for (const p of products) {
    if (typeof p.image_url === 'string' && p.image_url.startsWith('data:image/')) {
      console.log(`Processing product: ${p.name} (${p.id}) - size: ${(p.image_url.length / 1024).toFixed(1)} KB`);
      try {
        const match = p.image_url.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (match) {
          const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
          const buffer = Buffer.from(match[2], 'base64');
          const filePath = `catalog/${p.id}_${Date.now()}.${ext}`;

          const { error: uploadErr } = await client.storage
            .from('product-images')
            .upload(filePath, buffer, {
              contentType: `image/${match[1]}`,
              upsert: true,
            });

          if (uploadErr) {
            console.error('  Upload error:', uploadErr.message);
          } else {
            const { data: urlData } = client.storage.from('product-images').getPublicUrl(filePath);
            console.log('  Uploaded to:', urlData.publicUrl);
            await client.from('products').update({ image_url: urlData.publicUrl }).eq('id', p.id);
            console.log('  Updated database!');
          }
        }
      } catch (err) {
        console.error('  Error:', err);
      }
    }
  }
  console.log('Product images migration complete!');
}

migrateProducts();
