// ==============================================================================
// src/lib/data/marketCategories.ts
// Comprehensive Retail Market Categories Directory (India & Local Commerce)
// Covers all physical retail categories with bilingual labels, icons & search tags
// ==============================================================================

import { Category } from '@/types';

export interface MarketCategoryInfo extends Category {
  hindiName: string;
  popularPills: string[];
}

export const MASTER_MARKET_CATEGORIES: MarketCategoryInfo[] = [
  // 1. Grocery & Kirana
  {
    id: 'c1000000-0000-0000-0000-000000000003', // Preserves existing Grocery UUID
    name: 'Grocery, Kirana & Daily Staples',
    hindiName: 'किराना, राशन व दैनिक सामान',
    slug: 'groceries',
    icon: 'ShoppingBasket',
    description: 'Chakki atta, rice, pulses, cooking oils, ghee, spices, sugar & salt',
    popularPills: ['Atta', 'Rice', 'Mustard Oil', 'Dal', 'Spices', 'Sugar'],
    sortOrder: 1,
    isActive: true,
    subcategories: [
      { id: 's-groc-01', categoryId: 'c1000000-0000-0000-0000-000000000003', name: 'Atta, Flours & Grains', slug: 'flours', sortOrder: 1, isActive: true },
      { id: 's-groc-02', categoryId: 'c1000000-0000-0000-0000-000000000003', name: 'Rice & Basmati', slug: 'rice', sortOrder: 2, isActive: true },
      { id: 's-groc-03', categoryId: 'c1000000-0000-0000-0000-000000000003', name: 'Edible Oils & Pure Ghee', slug: 'oils-ghee', sortOrder: 3, isActive: true },
      { id: 's-groc-04', categoryId: 'c1000000-0000-0000-0000-000000000003', name: 'Dals & Pulses', slug: 'pulses', sortOrder: 4, isActive: true },
      { id: 's-groc-05', categoryId: 'c1000000-0000-0000-0000-000000000003', name: 'Masalas & Whole Spices', slug: 'spices', sortOrder: 5, isActive: true },
    ]
  },

  // 2. Dairy & Bakery
  {
    id: 'c1000000-0000-0000-0000-000000000011',
    name: 'Dairy, Milk, Bread & Eggs',
    hindiName: 'दूध, मक्खन, पनीर, ब्रेड व अंडे',
    slug: 'dairy-bakery',
    icon: 'Milk',
    description: 'Fresh milk pouches, butter, paneer, curd, bread, rusks & eggs',
    popularPills: ['Milk', 'Butter', 'Paneer', 'Curd', 'Brown Bread', 'Eggs'],
    sortOrder: 2,
    isActive: true,
    subcategories: [
      { id: 's-dry-01', categoryId: 'c1000000-0000-0000-0000-000000000011', name: 'Fresh Milk & Cream', slug: 'milk', sortOrder: 1, isActive: true },
      { id: 's-dry-02', categoryId: 'c1000000-0000-0000-0000-000000000011', name: 'Butter, Cheese & Paneer', slug: 'butter-paneer', sortOrder: 2, isActive: true },
      { id: 's-dry-03', categoryId: 'c1000000-0000-0000-0000-000000000011', name: 'Bread, Pav & Buns', slug: 'bread-bakery', sortOrder: 3, isActive: true },
      { id: 's-dry-04', categoryId: 'c1000000-0000-0000-0000-000000000011', name: 'Farm Fresh Eggs', slug: 'eggs', sortOrder: 4, isActive: true },
    ]
  },

  // 3. Packaged Foods & Snacks
  {
    id: 'c1000000-0000-0000-0000-000000000012',
    name: 'Packaged Foods, Snacks & Biscuits',
    hindiName: 'नमकीन, बिस्कुट, चिप्स व नूडल्स',
    slug: 'packaged-snacks',
    icon: 'Cookie',
    description: 'Namkeen, chips, biscuits, Maggi noodles, chocolates & sauces',
    popularPills: ['Biscuits', 'Namkeen', 'Maggi Noodles', 'Chips', 'Chocolates'],
    sortOrder: 3,
    isActive: true,
  },

  // 4. Beverages & Drinks
  {
    id: 'c1000000-0000-0000-0000-000000000013',
    name: 'Beverages, Tea, Coffee & Cold Drinks',
    hindiName: 'चाय, कॉफी, जूस व शीतल पेय',
    slug: 'beverages',
    icon: 'Coffee',
    description: 'Tea leaves, instant coffee, cold drinks, packaged juices, mineral water',
    popularPills: ['Tea Leaves', 'Instant Coffee', 'Cold Drinks', 'Fruit Juice', 'Energy Drink'],
    sortOrder: 4,
    isActive: true,
  },

  // 5. Fresh Fruits & Vegetables
  {
    id: 'c1000000-0000-0000-0000-000000000014',
    name: 'Fresh Fruits & Vegetables',
    hindiName: 'ताजे फल व हरी सब्जियां',
    slug: 'fruits-vegetables',
    icon: 'Apple',
    description: 'Farm fresh seasonal vegetables, potatoes, onions, tomatoes & fresh fruits',
    popularPills: ['Potatoes', 'Onions', 'Tomatoes', 'Apples', 'Bananas', 'Green Veggies'],
    sortOrder: 5,
    isActive: true,
  },

  // 6. Electronics & Mobile
  {
    id: 'c1000000-0000-0000-0000-000000000001', // Preserves existing Electronics UUID
    name: 'Electronics, Mobiles & Accessories',
    hindiName: 'मोबाइल, चार्जर व इलेक्ट्रॉनिक्स',
    slug: 'electronics',
    icon: 'Smartphone',
    description: 'Smartphones, fast chargers, cables, earbuds, powerbanks & smartwatches',
    popularPills: ['Fast Charger', 'Type-C Cable', 'Earbuds', 'Smartwatch', 'Power Bank'],
    sortOrder: 6,
    isActive: true,
    subcategories: [
      { id: 's2000000-0001', categoryId: 'c1000000-0000-0000-0000-000000000001', name: 'Mobile Chargers & Cables', slug: 'chargers', sortOrder: 1, isActive: true },
      { id: 's2000000-0002', categoryId: 'c1000000-0000-0000-0000-000000000001', name: 'Earphones & Audio', slug: 'audio', sortOrder: 2, isActive: true },
      { id: 's2000000-0003b', categoryId: 'c1000000-0000-0000-0000-000000000001', name: 'Mobile Covers & Tempered Glass', slug: 'covers-glass', sortOrder: 3, isActive: true },
    ]
  },

  // 7. Computers & IT Storage
  {
    id: 'c1000000-0000-0000-0000-000000000002', // Preserves existing Computers UUID
    name: 'Computers, Laptops & IT Peripherals',
    hindiName: 'कंप्यूटर, लैपटॉप व स्टोरेज',
    slug: 'computers',
    icon: 'Laptop',
    description: 'SSDs, pendrives, wireless mice, keyboards, laptops & printer ink',
    popularPills: ['NVMe SSD', 'Wireless Mouse', 'Pendrive', 'Keyboard', 'Laptop RAM'],
    sortOrder: 7,
    isActive: true,
    subcategories: [
      { id: 's2000000-0003', categoryId: 'c1000000-0000-0000-0000-000000000002', name: 'Internal SSDs & Storage', slug: 'ssds', sortOrder: 1, isActive: true },
      { id: 's2000000-0004', categoryId: 'c1000000-0000-0000-0000-000000000002', name: 'Keyboards & Mice', slug: 'mice-keyboards', sortOrder: 2, isActive: true },
    ]
  },

  // 8. Home Appliances & Kitchenware
  {
    id: 'c1000000-0000-0000-0000-000000000015',
    name: 'Home Appliances & Kitchenware',
    hindiName: 'किचन व होम उपकरण (बर्तन व मिक्सी)',
    slug: 'home-appliances',
    icon: 'UtensilsCrossed',
    description: 'Mixer grinders, electric kettles, pressure cookers, cookware, fans & irons',
    popularPills: ['Mixer Grinder', 'Pressure Cooker', 'Ceiling Fan', 'Electric Kettle', 'Iron'],
    sortOrder: 8,
    isActive: true,
  },

  // 9. Hardware & Tools
  {
    id: 'c1000000-0000-0000-0000-000000000004', // Preserves existing Hardware UUID
    name: 'Hardware, Tools & Sanitaryware',
    hindiName: 'हार्डवेयर, औजार व सेनेटरी फिटिंग्स',
    slug: 'hardware',
    icon: 'Wrench',
    description: 'Brass padlocks, hand tools, plumbing pipes, taps, adhesives & fasteners',
    popularPills: ['Padlocks', 'Hand Tools', 'PVC Pipes', 'Fevicol Adhesive', 'Taps & Showers'],
    sortOrder: 9,
    isActive: true,
    subcategories: [
      { id: 's2000000-0007', categoryId: 'c1000000-0000-0000-0000-000000000004', name: 'Brass Padlocks & Fasteners', slug: 'locks', sortOrder: 1, isActive: true },
    ]
  },

  // 10. Electricals & Lighting
  {
    id: 'c1000000-0000-0000-0000-000000000016',
    name: 'Electricals, Lighting & Wire Fittings',
    hindiName: 'बिजली का सामान, एलईडी बल्ब व तार',
    slug: 'electricals',
    icon: 'Zap',
    description: 'LED bulbs, batten lights, modular switches, sockets, copper wires & extension boards',
    popularPills: ['9W LED Bulb', 'Modular Switch', 'Extension Board', 'Copper Wire', 'MCB'],
    sortOrder: 10,
    isActive: true,
  },

  // 11. Paints, Putty & Building Materials
  {
    id: 'c1000000-0000-0000-0000-000000000017',
    name: 'Paints, Wall Putty & Water-Proofing',
    hindiName: 'पेंट, डिस्टेंपर, पुट्टी व वॉटरप्रूफिंग',
    slug: 'paints',
    icon: 'Paintbrush',
    description: 'Wall distemper, plastic emulsion, primers, putty, paint brushes & waterproofing',
    popularPills: ['Wall Putty', 'Emulsion Paint', 'Primer', 'Paint Brush', 'Dr Fixit'],
    sortOrder: 11,
    isActive: true,
  },

  // 12. Pharmacy & Healthcare
  {
    id: 'c1000000-0000-0000-0000-000000000005', // Matches Supabase Pharmacy ID
    name: 'Pharmacy, Healthcare & First Aid',
    hindiName: 'दवाइयां, मेडिकल व प्राथमिक चिकित्सा',
    slug: 'pharmacy',
    icon: 'PlusCircle',
    description: 'OTC medicines, pain balms, cough syrups, antiseptic liquids, bandages & glucose',
    popularPills: ['Pain Spray', 'Vicks VapoRub', 'Band-Aid', 'Antiseptic Liquid', 'Dolo 650'],
    sortOrder: 12,
    isActive: true,
  },

  // 13. Personal Care, Beauty & Cosmetics
  {
    id: 'c1000000-0000-0000-0000-000000000018',
    name: 'Personal Care, Beauty & Cosmetics',
    hindiName: 'ब्यूटी, स्किनकेयर, साबुन व शैम्पू',
    slug: 'personal-care',
    icon: 'Sparkles',
    description: 'Bathing soaps, shampoos, skin creams, body lotions, face wash & hair oils',
    popularPills: ['Bathing Soap', 'Hair Shampoo', 'Face Wash', 'Cold Cream', 'Hair Oil'],
    sortOrder: 13,
    isActive: true,
  },

  // 14. Oral Care & Shaving Hygiene
  {
    id: 'c1000000-0000-0000-0000-000000000019',
    name: 'Oral Care, Dental & Grooming',
    hindiName: 'टूथपेस्ट, ब्रश व शेविंग का सामान',
    slug: 'oral-grooming',
    icon: 'Smile',
    description: 'Toothpastes, toothbrushes, shaving creams, razor blades & deodorants',
    popularPills: ['Colgate Toothpaste', 'Toothbrush', 'Shaving Foam', 'Razor Blades', 'Deo Spray'],
    sortOrder: 14,
    isActive: true,
  },

  // 15. Cleaning & Housekeeping Essentials
  {
    id: 'c1000000-0000-0000-0000-000000000020',
    name: 'Cleaning, Detergents & Home Hygiene',
    hindiName: 'सफाई, डिटर्जेंट, फिनाइल व डिशवॉश',
    slug: 'cleaning-homecare',
    icon: 'Sparkle',
    description: 'Washing powder, dishwash liquids, toilet cleaner, floor phenyl & brooms',
    popularPills: ['Detergent Powder', 'Dishwash Bar', 'Toilet Cleaner', 'Floor Cleaner', 'Broom'],
    sortOrder: 15,
    isActive: true,
  },

  // 16. Men's Fashion & Garments
  {
    id: 'c1000000-0000-0000-0000-000000000021',
    name: "Men's Clothing & Apparel",
    hindiName: 'पुरुषों के कपड़े, शर्ट, जींस व बनियान',
    slug: 'mens-wear',
    icon: 'Shirt',
    description: "Men's formal & casual shirts, jeans, trousers, t-shirts, kurtas & innerwear",
    popularPills: ['Cotton Shirt', 'Jeans', 'Polo T-Shirt', 'Kurta Pajama', 'Vest / Vaniyan'],
    sortOrder: 16,
    isActive: true,
  },

  // 17. Women's Fashion & Ethnic Wear
  {
    id: 'c1000000-0000-0000-0000-000000000022',
    name: "Women's Clothing, Sarees & Suits",
    hindiName: 'महिलाओं के कपड़े, साड़ियां, सूट व कुर्ती',
    slug: 'womens-wear',
    icon: 'Palette',
    description: 'Sarees, salwar suits, kurtis, dupattas, leggings, nightwear & dress materials',
    popularPills: ['Banarasi Saree', 'Salwar Suit', 'Cotton Kurti', 'Leggings', 'Nighty'],
    sortOrder: 17,
    isActive: true,
  },

  // 18. Kids Wear & Baby Clothing
  {
    id: 'c1000000-0000-0000-0000-000000000023',
    name: "Kids & Baby Clothing",
    hindiName: 'बच्चों के कपड़े व स्कूल यूनिफॉर्म',
    slug: 'kids-wear',
    icon: 'Baby',
    description: 'Baby sets, kids t-shirts, shorts, frocks, socks & school uniforms',
    popularPills: ['Baby Romper', 'Kids Frock', 'Shorts & T-Shirt', 'School Uniform'],
    sortOrder: 18,
    isActive: true,
  },

  // 19. Footwear, Shoes & Slippers
  {
    id: 'c1000000-0000-0000-0000-000000000024',
    name: 'Footwear, Shoes, Chappals & Sandals',
    hindiName: 'जूते, चप्पल, सैंडल व स्लीपर',
    slug: 'footwear',
    icon: 'Footprints',
    description: 'Leather shoes, sports running shoes, hawai chappals, sandals & school shoes',
    popularPills: ['Hawai Chappal', 'Running Shoes', 'Leather Shoes', 'Sandals', 'School Shoes'],
    sortOrder: 19,
    isActive: true,
  },

  // 20. Stationery, Books & School Items
  {
    id: 'c1000000-0000-0000-0000-000000000025',
    name: 'Stationery, Books & School Supplies',
    hindiName: 'स्टेशनरी, कॉपियां, पेन व किताबें',
    slug: 'stationery',
    icon: 'BookOpen',
    description: 'Registers, notebooks, ball pens, pencils, geometry box, Xerox paper & files',
    popularPills: ['Classmate Register', 'Ball Pen', 'Pencils', 'A4 Paper', 'School Bag'],
    sortOrder: 20,
    isActive: true,
  },

  // 21. Toys, Games & Baby Care
  {
    id: 'c1000000-0000-0000-0000-000000000026',
    name: 'Toys, Board Games & Baby Diapers',
    hindiName: 'खिलौने, डाइपर व बच्चों का सामान',
    slug: 'toys-babycare',
    icon: 'Gamepad2',
    description: 'Baby diapers, wet wipes, baby food, educational toys, remote cars & board games',
    popularPills: ['Baby Diapers', 'Wet Wipes', 'Board Games', 'Remote Toy Car', 'Rattles'],
    sortOrder: 21,
    isActive: true,
  },

  // 22. Sports, Fitness & Gym Gear
  {
    id: 'c1000000-0000-0000-0000-000000000027',
    name: 'Sports, Fitness & Outdoor Goods',
    hindiName: 'खेलकूद, क्रिकेट बैट, बैडमिंटन व जिम',
    slug: 'sports-fitness',
    icon: 'Trophy',
    description: 'Cricket bats, tennis balls, badminton rackets, shuttlecocks, skipping ropes & gym dumbells',
    popularPills: ['Cricket Bat', 'Tennis Ball', 'Badminton Racket', 'Shuttlecock', 'Yoga Mat'],
    sortOrder: 22,
    isActive: true,
  },

  // 23. Automobile Spares, Tyres & Lubricants
  {
    id: 'c1000000-0000-0000-0000-000000000028',
    name: 'Automobile Spares, Tyres & Engine Oils',
    hindiName: 'गाड़ी का सामान, हेलमेट, इंजन ऑयल व टायर',
    slug: 'auto-parts',
    icon: 'Car',
    description: 'Bike helmets, 4T engine oils, tyres, puncture kits, seat covers, horns & bulbs',
    popularPills: ['4T Engine Oil', 'Bike Helmet', 'Tube / Tyre', 'Puncture Kit', 'Chain Lube'],
    sortOrder: 23,
    isActive: true,
  },

  // 24. Jewellery, Watches & Optical
  {
    id: 'c1000000-0000-0000-0000-000000000029',
    name: 'Jewellery, Watches, Clocks & Eyewear',
    hindiName: 'घड़ियां, ज्वेलरी, चश्मे व दीवार घड़ी',
    slug: 'jewellery-watches',
    icon: 'Watch',
    description: 'Wrist watches, wall clocks, artificial jewellery, sunglasses, spectacle frames',
    popularPills: ['Wrist Watch', 'Wall Clock', 'Sunglasses', 'Artificial Jewellery', 'Bangles'],
    sortOrder: 24,
    isActive: true,
  },

  // 25. Pooja & Spiritual Essentials
  {
    id: 'c1000000-0000-0000-0000-000000000030',
    name: 'Pooja, Spiritual & Mandir Essentials',
    hindiName: 'पूजा सामग्री, अगरबत्ती, धूप व कपूर',
    slug: 'pooja-spiritual',
    icon: 'Flame',
    description: 'Agarbatti, dhoop sticks, pure camphor, diya cotton wicks, gangajal & havan samagri',
    popularPills: ['Agarbatti', 'Pure Camphor', 'Dhoop Batti', 'Diya Wicks', 'Roli Chawal'],
    sortOrder: 25,
    isActive: true,
  },

  // 26. Gifts, Novelties & Home Decor
  {
    id: 'c1000000-0000-0000-0000-000000000031',
    name: 'Gifts, Novelties & Party Decorations',
    hindiName: 'गिफ्ट्स, सजावट, फोटो फ्रेम व खिलौने',
    slug: 'gifts-decor',
    icon: 'Gift',
    description: 'Photo frames, birthday balloons, gift wrapping, decorative lamps, wind chimes',
    popularPills: ['Gift Items', 'Photo Frame', 'Birthday Balloons', 'Showpieces', 'Lamps'],
    sortOrder: 26,
    isActive: true,
  },

  // 27. Pet Supplies & Pet Food
  {
    id: 'c1000000-0000-0000-0000-000000000032',
    name: 'Pet Food, Dog Food & Accessories',
    hindiName: 'पालतू जानवरों का खाना, डॉग फूड व पट्टे',
    slug: 'pet-supplies',
    icon: 'Cat',
    description: 'Pedigree dog food, Whiskas cat food, pet biscuits, leashes, chew toys & shampoos',
    popularPills: ['Dog Food', 'Cat Food', 'Chew Bones', 'Pet Collar / Leash'],
    sortOrder: 27,
    isActive: true,
  },

  // 28. Meat, Poultry, Fish & Eggs
  {
    id: 'c1000000-0000-0000-0000-000000000033',
    name: 'Fresh Meat, Chicken, Fish & Mutton',
    hindiName: 'ताजा चिकन, मटन, मछली व अंडे',
    slug: 'meat-fish',
    icon: 'Fish',
    description: 'Clean dressed fresh chicken, mutton cuts, freshwater fish, prawns & eggs',
    popularPills: ['Fresh Chicken', 'Mutton', 'Fish / Rohu', 'Eggs Tray'],
    sortOrder: 28,
    isActive: true,
  },

  // 29. Furniture, Mattresses & Furnishings
  {
    id: 'c1000000-0000-0000-0000-000000000034',
    name: 'Furniture, Mattresses & Bedding',
    hindiName: 'फर्नीचर, गद्दे, चादरें व पर्दे',
    slug: 'furniture-bedding',
    icon: 'Bed',
    description: 'Bedsheets, curtains, plastic chairs, study tables, pillows & foam mattresses',
    popularPills: ['Cotton Bedsheet', 'Plastic Chair', 'Curtains', 'Pillow', 'Mattress'],
    sortOrder: 29,
    isActive: true,
  },

  // 30. Luggage, Backpacks & Travel Bags
  {
    id: 'c1000000-0000-0000-0000-000000000035',
    name: 'Bags, Backpacks, Luggage & Wallets',
    hindiName: 'बैग, स्कूल बैग, ट्रॉली बैग व पर्स',
    slug: 'bags-luggage',
    icon: 'Briefcase',
    description: 'College backpacks, school bags, trolley suitcases, duffel bags, leather wallets',
    popularPills: ['School Bag', 'Trolley Bag', 'College Backpack', 'Leather Wallet'],
    sortOrder: 30,
    isActive: true,
  }
];

/**
 * Filter market categories using fuzzy search on English name, Hindi name, description or popular pills.
 */
export function searchMarketCategories(query: string): MarketCategoryInfo[] {
  const clean = (query || '').trim().toLowerCase();
  if (!clean) return MASTER_MARKET_CATEGORIES;

  return MASTER_MARKET_CATEGORIES.filter(cat => {
    return (
      cat.name.toLowerCase().includes(clean) ||
      cat.hindiName.toLowerCase().includes(clean) ||
      cat.slug.toLowerCase().includes(clean) ||
      (cat.description && cat.description.toLowerCase().includes(clean)) ||
      cat.popularPills.some(p => p.toLowerCase().includes(clean)) ||
      (cat.subcategories && cat.subcategories.some(sub => sub.name.toLowerCase().includes(clean)))
    );
  });
}

/**
 * Find category by ID or slug.
 */
export function getCategoryByIdOrSlug(idOrSlug: string): MarketCategoryInfo | undefined {
  return MASTER_MARKET_CATEGORIES.find(
    c => c.id === idOrSlug || c.slug === idOrSlug
  );
}
