import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhbhupmiwbwsaqeuziin.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYmh1cG1pd2J3c2FxZXV6aWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTc1NTA5MiwiZXhwIjoyMTA1MzMxMDkyfQ.NESHP7JGXDTEtgn5qXsIk5-Hb1lxtWaKess2jfM_3tg';

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
