-- ==============================================================================
-- MIGRATION 010: Merchant Onboarding Atomic RPC
-- Creates merchants -> businesses -> shops in a single secure transaction
-- DOES NOT modify profiles.role (merchant capability is presence in merchants table)
-- Only service_role can execute this RPC (invoked via server action after auth verification)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.onboard_merchant_atomic(
    p_profile_id UUID,
    p_owner_name VARCHAR(150),
    p_mobile VARCHAR(20),
    p_business_name VARCHAR(200),
    p_shop_name VARCHAR(200),
    p_phone VARCHAR(20),
    p_whatsapp VARCHAR(20) DEFAULT NULL,
    p_address TEXT DEFAULT '',
    p_landmark VARCHAR(150) DEFAULT NULL,
    p_city VARCHAR(100) DEFAULT '',
    p_state VARCHAR(100) DEFAULT NULL,
    p_pincode VARCHAR(20) DEFAULT NULL,
    p_latitude DOUBLE PRECISION DEFAULT 0.0,
    p_longitude DOUBLE PRECISION DEFAULT 0.0,
    p_opening_hours VARCHAR(100) DEFAULT '9:30 AM - 9:00 PM',
    p_logo_url TEXT DEFAULT NULL,
    p_photos TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_merchant_id UUID;
    v_business_id UUID;
    v_shop_id UUID;
    v_base_slug TEXT;
    v_slug TEXT;
    v_counter INT := 0;
BEGIN
    -- 1. Validate profile existence
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
        RAISE EXCEPTION 'Profile with ID % does not exist', p_profile_id;
    END IF;

    -- 2. Upsert merchant row (one merchant record per profile)
    INSERT INTO public.merchants (
        profile_id,
        owner_name,
        mobile,
        is_mobile_verified,
        verification_status
    )
    VALUES (
        p_profile_id,
        p_owner_name,
        p_mobile,
        false,
        'pending'
    )
    ON CONFLICT (profile_id) DO UPDATE
    SET
        owner_name = EXCLUDED.owner_name,
        mobile = EXCLUDED.mobile,
        updated_at = NOW()
    RETURNING id INTO v_merchant_id;

    -- 3. Create business record tied to merchant
    INSERT INTO public.businesses (
        merchant_id,
        business_name,
        subscription_tier
    )
    VALUES (
        v_merchant_id,
        p_business_name,
        'free'
    )
    RETURNING id INTO v_business_id;

    -- 4. Generate unique shop slug
    v_base_slug := lower(regexp_replace(trim(p_shop_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);
    IF v_base_slug IS NULL OR v_base_slug = '' THEN
        v_base_slug := 'shop';
    END IF;

    v_slug := v_base_slug;
    WHILE EXISTS (SELECT 1 FROM public.shops WHERE slug = v_slug) LOOP
        v_counter := v_counter + 1;
        v_slug := v_base_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
        IF v_counter > 10 THEN
            v_slug := v_base_slug || '-' || extract(epoch from now())::bigint::text;
            EXIT;
        END IF;
    END LOOP;

    -- 5. Create shop record linked to business
    INSERT INTO public.shops (
        business_id,
        name,
        slug,
        phone,
        whatsapp,
        address,
        landmark,
        city,
        state,
        pincode,
        location,
        opening_hours,
        logo_url,
        photos,
        is_open,
        is_active
    )
    VALUES (
        v_business_id,
        p_shop_name,
        v_slug,
        p_phone,
        p_whatsapp,
        p_address,
        p_landmark,
        p_city,
        p_state,
        p_pincode,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        COALESCE(p_opening_hours, '9:30 AM - 9:00 PM'),
        p_logo_url,
        COALESCE(p_photos, '{}'::text[]),
        true,
        true
    )
    RETURNING id INTO v_shop_id;

    -- Return JSON summary of created resources
    RETURN jsonb_build_object(
        'success', true,
        'merchant_id', v_merchant_id,
        'business_id', v_business_id,
        'shop_id', v_shop_id,
        'shop_slug', v_slug
    );
END;
$$;

-- Secure access: only service_role (via backend server actions) can call this
REVOKE ALL ON FUNCTION public.onboard_merchant_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.onboard_merchant_atomic TO service_role;
