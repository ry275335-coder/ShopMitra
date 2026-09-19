-- ==============================================================================
-- 002_postgis_and_indexes.sql
-- Spatial, Full-Text, Trigram Indexes and Database-Level Geo Query Functions
-- ==============================================================================

-- 1. Enable Trigram Extension for Fuzzy Product Matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Spatial Geospatial Indexes (GIST on Geography Points)
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_saved_addresses_location ON saved_addresses USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_price_alerts_location ON price_alerts USING GIST(user_location);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_location ON stock_alerts USING GIST(user_location);

-- 3. Trigram Fuzzy Search Indexes
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON products USING GIN(brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_model_trgm ON products USING GIN(model gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_shops_name_trgm ON shops USING GIN(name gin_trgm_ops);

-- 4. B-Tree Indexes for High-Velocity Filtering & Sorting
CREATE INDEX IF NOT EXISTS idx_shop_products_shop ON shop_products(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_product ON shop_products(product_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_price ON shop_products(current_price ASC);
CREATE INDEX IF NOT EXISTS idx_shop_products_stock ON shop_products(stock_status);
CREATE INDEX IF NOT EXISTS idx_shop_products_freshness ON shop_products(last_price_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_products_active ON shop_products(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

CREATE INDEX IF NOT EXISTS idx_price_history_product_date ON price_history(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON analytics_events(event_type, created_at DESC);

-- 5. High-Performance Spatial Stored Procedure (RPC)
-- Returns nearby shops selling a specific product, sorted by lowest price or nearest distance
CREATE OR REPLACE FUNCTION get_nearby_rates_for_product(
    p_product_id UUID,
    p_user_lat DOUBLE PRECISION,
    p_user_lng DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION DEFAULT 5000,
    p_sort_by TEXT DEFAULT 'price_asc', -- 'price_asc', 'distance_asc', 'rating_desc'
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    shop_id UUID,
    shop_name VARCHAR(200),
    shop_slug VARCHAR(250),
    shop_phone VARCHAR(20),
    shop_whatsapp VARCHAR(20),
    shop_address TEXT,
    shop_landmark VARCHAR(150),
    is_verified BOOLEAN,
    verification_badge VARCHAR(100),
    rating NUMERIC(3, 2),
    review_count INT,
    distance_meters DOUBLE PRECISION,
    current_price NUMERIC(10, 2),
    previous_price NUMERIC(10, 2),
    stock_status stock_status,
    stock_quantity INT,
    last_price_updated_at TIMESTAMPTZ,
    is_anomaly_flagged BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    user_geo GEOGRAPHY;
BEGIN
    user_geo := ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography;

    RETURN QUERY
    SELECT 
        s.id AS shop_id,
        s.name AS shop_name,
        s.slug AS shop_slug,
        s.phone AS shop_phone,
        s.whatsapp AS shop_whatsapp,
        s.address AS shop_address,
        s.landmark AS shop_landmark,
        s.is_verified,
        s.verification_badge,
        s.rating,
        s.review_count,
        ST_Distance(s.location, user_geo) AS distance_meters,
        sp.current_price,
        sp.previous_price,
        sp.stock_status,
        sp.stock_quantity,
        sp.last_price_updated_at,
        sp.is_anomaly_flagged
    FROM shop_products sp
    JOIN shops s ON sp.shop_id = s.id
    WHERE sp.product_id = p_product_id
      AND sp.status = 'active'
      AND s.is_active = true
      AND ST_DWithin(s.location, user_geo, p_radius_meters)
    ORDER BY
        CASE WHEN p_sort_by = 'price_asc' THEN sp.current_price END ASC,
        CASE WHEN p_sort_by = 'distance_asc' THEN ST_Distance(s.location, user_geo) END ASC,
        CASE WHEN p_sort_by = 'rating_desc' THEN s.rating END DESC,
        sp.current_price ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
