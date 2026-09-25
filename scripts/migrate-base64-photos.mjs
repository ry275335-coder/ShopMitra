import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vhbhupmiwbwsaqeuziin.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Fetching all shops to migrate base64 photos...');
  const { data: shops, error } = await client.from('shops').select('id, name, photos');
  if (error || !shops) {
    console.error('Failed to fetch shops:', error);
    return;
  }

  for (const shop of shops) {
    console.log(`\nProcessing shop: ${shop.name} (${shop.id})`);
    const currentPhotos = shop.photos || [];
    const newPhotos = [];
    let updated = false;

    for (let i = 0; i < currentPhotos.length; i++) {
      const p = currentPhotos[i];
      if (typeof p !== 'string') continue;

      if (p.startsWith('data:image/')) {
        console.log(`  Photo ${i} is base64 (${(p.length / 1024).toFixed(1)} KB), uploading to storage...`);
        try {
          const match = p.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
          if (match) {
            const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
            const buffer = Buffer.from(match[2], 'base64');
            const filePath = `storefronts/${shop.id}_photo_${i}_${Date.now()}.${ext}`;

            const { data: uploadData, error: uploadErr } = await client.storage
              .from('shop-images')
              .upload(filePath, buffer, {
                contentType: `image/${match[1]}`,
                upsert: true,
              });

            if (uploadErr) {
              console.error('    Upload failed:', uploadErr.message);
              // Fallback to high quality storefront Unsplash image
              newPhotos.push('https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80');
            } else {
              const { data: urlData } = client.storage.from('shop-images').getPublicUrl(filePath);
              console.log('    Uploaded successfully to CDN:', urlData.publicUrl);
              newPhotos.push(urlData.publicUrl);
            }
            updated = true;
          } else {
            newPhotos.push('https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80');
            updated = true;
          }
        } catch (err) {
          console.error('    Error processing base64:', err);
          newPhotos.push('https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80');
          updated = true;
        }
      } else if (p.startsWith('blob:')) {
        console.log(`  Photo ${i} is a local blob URL (${p}), replacing with default CDN photo...`);
        newPhotos.push('https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80');
        updated = true;
      } else {
        newPhotos.push(p);
      }
    }

    if (updated) {
      console.log(`  Updating shop "${shop.name}" in database...`);
      const { error: updateErr } = await client
        .from('shops')
        .update({ photos: newPhotos })
        .eq('id', shop.id);

      if (updateErr) {
        console.error('    Database update failed:', updateErr.message);
      } else {
        console.log('    ✓ Database updated successfully!');
      }
    } else {
      console.log('  No base64 photos found, skipping.');
    }
  }

  console.log('\nMigration complete!');
}

migrate();
