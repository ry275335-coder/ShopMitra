-- ==============================================================================
-- seed.sql
-- Development and Pilot Demonstration Seed Dataset for ShopMitra
-- ==============================================================================

-- 1. Insert Master Categories
INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
('c1000000-0000-0000-0000-000000000001', 'Electronics & Mobile', 'electronics', 'Smartphone', 1),
('c1000000-0000-0000-0000-000000000002', 'Computers & Storage', 'computers', 'Laptop', 2),
('c1000000-0000-0000-0000-000000000003', 'Grocery & Daily Essentials', 'groceries', 'ShoppingBasket', 3),
('c1000000-0000-0000-0000-000000000004', 'Hardware & Electrical', 'hardware', 'Wrench', 4),
('c1000000-0000-0000-0000-000000000005', 'Pharmacy & Health', 'pharmacy', 'HeartPulse', 5)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Subcategories
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
('a2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Mobile Chargers & Cables', 'chargers-cables', 1),
('a2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Earphones & Audio', 'audio', 2),
('a2000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'Internal SSDs & Storage', 'ssd-storage', 1),
('a2000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'Keyboards & Mice', 'peripherals', 2),
('a2000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000003', 'Atta, Flours & Grains', 'staples', 1),
('a2000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000003', 'Dairy, Milk & Butter', 'dairy', 2),
('a2000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000004', 'Locks & Fasteners', 'locks', 1)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Master Products
INSERT INTO products (id, category_id, subcategory_id, name, slug, brand, model, mrp, image_url, description) VALUES
(
    'b3000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001',
    'Samsung 25W Type-C Super Fast Charger',
    'samsung-25w-type-c-super-fast-charger',
    'Samsung',
    'EP-TA800N',
    1299.00,
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
    'Official Samsung Power Delivery 3.0 Type-C travel wall adapter for Galaxy smartphones.'
),
(
    'b3000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000003',
    'Crucial P3 1TB PCIe 3.0 3D NAND NVMe M.2 SSD',
    'crucial-p3-1tb-nvme-m2-ssd',
    'Crucial',
    'CT1000P3SSD8',
    7500.00,
    'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80',
    'Blazing fast NVMe M.2 solid-state drive with sequential read speeds up to 3,500 MB/s.'
),
(
    'b3000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000004',
    'Logitech B170 Wireless Optical Mouse',
    'logitech-b170-wireless-mouse',
    'Logitech',
    'B170',
    895.00,
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
    'Plug-and-play 2.4 GHz optical mouse with reliable 10m range and 12-month battery life.'
),
(
    'b3000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000003',
    'a2000000-0000-0000-0000-000000000005',
    'Aashirvaad Shudh Chakki Whole Wheat Atta 5kg',
    'aashirvaad-shudh-chakki-atta-5kg',
    'Aashirvaad',
    '5KG-BAG',
    275.00,
    'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80',
    '100% pure whole wheat flour processed with traditional chakki grinding.'
),
(
    'b3000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000003',
    'a2000000-0000-0000-0000-000000000006',
    'Amul Pasteurised Salted Butter 500g',
    'amul-salted-butter-500g',
    'Amul',
    '500G-CARTON',
    285.00,
    'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop&q=80',
    'Rich and creamy salted dairy butter prepared from wholesome fresh milk.'
),
(
    'b3000000-0000-0000-0000-000000000006',
    'c1000000-0000-0000-0000-000000000004',
    'a2000000-0000-0000-0000-000000000007',
    'Godrej Nav-Tal 7 Levers Brass Padlock with 3 Keys',
    'godrej-nav-tal-7-levers-brass-padlock',
    'Godrej',
    'NAV-TAL-7L',
    680.00,
    'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
    'High-security solid brass padlock with hacksaw-resistant hardened steel shackle.'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Product Variants (SKU & Barcodes)
INSERT INTO product_variants (id, product_id, variant_name, sku, barcode, variant_mrp) VALUES
('e4000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'White / 25W Fast Adapter', 'SAM-25W-WHT', '8806090123456', 1299.00),
('e4000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000002', '1TB NVMe PCIe 3.0', 'CRU-P3-1TB', '0649528901234', 7500.00),
('e4000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000003', 'Black / 2.4GHz', 'LOG-B170-BLK', '0978551234567', 895.00),
('e4000000-0000-0000-0000-000000000004', 'b3000000-0000-0000-0000-000000000004', '5 kg Bag', 'ASH-ATTA-5KG', '8901725123456', 275.00),
('e4000000-0000-0000-0000-000000000005', 'b3000000-0000-0000-0000-000000000005', '500g Block', 'AML-BTR-500G', '8901262123456', 285.00),
('e4000000-0000-0000-0000-000000000006', 'b3000000-0000-0000-0000-000000000006', '7 Levers Medium', 'GDJ-LCK-7L', '8901023123456', 680.00)
ON CONFLICT (id) DO NOTHING;
