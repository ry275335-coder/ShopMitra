import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

async function testRpc() {
  console.log('Testing RPC onboard_merchant_atomic...');
  const { data, error } = await adminSupabase.rpc('onboard_merchant_atomic', {
    p_profile_id: '00000000-0000-0000-0000-000000000000',
    p_owner_name: 'test',
    p_mobile: '9999999999',
    p_business_name: 'test',
    p_shop_name: 'test',
    p_phone: '9999999999',
  });

  if (error) {
    console.log('RPC result error:', error.message, 'code:', error.code);
  } else {
    console.log('RPC result data:', data);
  }
}

testRpc();
