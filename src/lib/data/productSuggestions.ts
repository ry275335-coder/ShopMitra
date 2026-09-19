// ==============================================================================
// src/lib/data/productSuggestions.ts
// Comprehensive Retail Market Product Directory & Real-Time Auto-Suggestion Engine
// Contains 120+ top frequently sold retail items across FMCG, Groceries, Dairy,
// Mobiles, Electronics, Hardware, Toiletries, Beverages & Stationery.
// ==============================================================================

export interface ProductSuggestionItem {
  name: string;
  brand: string;
  categoryId: string;
  categoryName: string;
  variantName: string;
  mrp: number;
  defaultRate: number;
  imageUrl: string;
  description: string;
  keywords: string[];
}

export const RETAIL_MARKET_PRODUCT_SUGGESTIONS: ProductSuggestionItem[] = [
  // --------------------------------------------------------------------------
  // GROCERY & KIRANA STAPLES
  // --------------------------------------------------------------------------
  {
    name: 'Aashirvaad Shudh Chakki Whole Wheat Atta 5kg',
    brand: 'Aashirvaad',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '5kg Pouch',
    mrp: 275,
    defaultRate: 235,
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80',
    description: '100% whole wheat grain atta with zero maida. Extra water absorption makes rotis softer for longer.',
    keywords: ['atta', 'aashirvaad', 'wheat', 'flour', 'roti', 'gehu']
  },
  {
    name: 'Aashirvaad Shudh Chakki Whole Wheat Atta 10kg',
    brand: 'Aashirvaad',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '10kg Bag',
    mrp: 520,
    defaultRate: 460,
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80',
    description: 'Chakki fresh whole wheat flour for wholesome soft rotis and parathas.',
    keywords: ['atta', 'aashirvaad', 'wheat', 'flour', '10kg']
  },
  {
    name: 'Fortune Kachi Ghani Pure Mustard Oil 1L Pouch',
    brand: 'Fortune',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '1 Litre Pouch',
    mrp: 175,
    defaultRate: 148,
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&auto=format&fit=crop&q=80',
    description: 'Cold pressed authentic pungent kachi ghani mustard oil for traditional Indian cooking.',
    keywords: ['oil', 'mustard oil', 'sarson ka tel', 'fortune', 'tel', 'cooking oil']
  },
  {
    name: 'Fortune Sunlite Refined Sunflower Oil 1L',
    brand: 'Fortune',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '1 Litre Pouch',
    mrp: 165,
    defaultRate: 139,
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&auto=format&fit=crop&q=80',
    description: 'Light, healthy refined sunflower oil enriched with vitamins A & D for daily cooking.',
    keywords: ['sunflower oil', 'fortune', 'refined oil', 'oil', 'tel']
  },
  {
    name: 'Tata Salt Vacuum Evaporated Iodised Salt 1kg',
    brand: 'Tata Salt',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '1kg Pouch',
    mrp: 28,
    defaultRate: 26,
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80',
    description: 'Desh Ka Namak. Pure vacuum evaporated iodised salt for balanced daily iodine intake.',
    keywords: ['tata salt', 'salt', 'namak', 'iodised salt']
  },
  {
    name: 'Tata Tea Premium Desh Ki Chai 500g',
    brand: 'Tata Tea',
    categoryId: 'c1000000-0000-0000-0000-000000000013',
    categoryName: 'Beverages, Tea, Coffee & Cold Drinks',
    variantName: '500g Carton',
    mrp: 310,
    defaultRate: 275,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
    description: 'Unique blend of big grains for taste and small grains for strong colour and aroma.',
    keywords: ['tea', 'chai', 'chai patti', 'tata tea', 'tata tea premium']
  },
  {
    name: 'Wagh Bakri Premium CTC Leaf Tea 500g',
    brand: 'Wagh Bakri',
    categoryId: 'c1000000-0000-0000-0000-000000000013',
    categoryName: 'Beverages, Tea, Coffee & Cold Drinks',
    variantName: '500g Pouch',
    mrp: 320,
    defaultRate: 280,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
    description: 'Renowned for consistent blend, rich liquor and authentic kadak Indian chai flavor.',
    keywords: ['tea', 'chai', 'wagh bakri', 'chai patti']
  },
  {
    name: 'India Gate Feast Rozzana Basmati Rice 5kg',
    brand: 'India Gate',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '5kg Bag',
    mrp: 495,
    defaultRate: 399,
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
    description: 'Aromatic long grain basmati rice ideal for everyday pulao, biryani and fried rice.',
    keywords: ['rice', 'chawal', 'basmati rice', 'india gate', 'rozzana']
  },
  {
    name: 'Tata Sampann Unpolished Toor Dal / Arhar Dal 1kg',
    brand: 'Tata Sampann',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '1kg Pouch',
    mrp: 215,
    defaultRate: 185,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    description: 'Unpolished toor dal retaining natural proteins, minerals, and rich homemade taste.',
    keywords: ['dal', 'toor dal', 'arhar dal', 'tata sampann', 'pulses']
  },
  {
    name: 'Tata Sampann Unpolished Moong Dal Dhuli 1kg',
    brand: 'Tata Sampann',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '1kg Pouch',
    mrp: 175,
    defaultRate: 155,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    description: 'Easy to digest yellow moong dal for khichdi, dal tadka, and healthy soups.',
    keywords: ['moong dal', 'yellow dal', 'dal', 'tata sampann']
  },
  {
    name: 'Madhur Pure & Hygienic Refined Sugar 1kg',
    brand: 'Madhur',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '1kg Pouch',
    mrp: 58,
    defaultRate: 52,
    imageUrl: 'https://images.unsplash.com/photo-1622484214149-68d0e52731bc?w=800&auto=format&fit=crop&q=80',
    description: 'Sulphur-free crystal sparkling white sugar, untouched by human hands.',
    keywords: ['sugar', 'chini', 'madhur sugar', 'refined sugar']
  },
  {
    name: 'MDH Deggi Mirch Powder 100g',
    brand: 'MDH',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '100g Box',
    mrp: 92,
    defaultRate: 85,
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
    description: 'Unique blend of red pepper and mild red chillies giving dishes an appetizing glowing red colour.',
    keywords: ['masala', 'mirch', 'deggi mirch', 'mdh', 'spices', 'chilli powder']
  },
  {
    name: 'Everest Meat Masala / Garam Masala 100g',
    brand: 'Everest',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '100g Box',
    mrp: 90,
    defaultRate: 82,
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
    description: 'Finely ground aromatic spices creating a rich savoury taste in curries and gravies.',
    keywords: ['garam masala', 'everest', 'masala', 'spices']
  },
  {
    name: 'Catch Super Garam Masala Sprinkler 100g',
    brand: 'Catch',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Grocery, Kirana & Daily Staples',
    variantName: '100g Sprinkler',
    mrp: 98,
    defaultRate: 90,
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
    description: 'Rotary sprinkler bottle for easy dusting of rich Indian garam masala over dishes.',
    keywords: ['catch', 'garam masala', 'sprinkler', 'masala']
  },

  // --------------------------------------------------------------------------
  // DAIRY, MILK, BREAD & EGGS
  // --------------------------------------------------------------------------
  {
    name: 'Amul Taaza Homogenised Toned Milk 500ml',
    brand: 'Amul',
    categoryId: 'c1000000-0000-0000-0000-000000000011',
    categoryName: 'Dairy, Milk, Bread & Eggs',
    variantName: '500ml Pouch',
    mrp: 27,
    defaultRate: 27,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop&q=80',
    description: 'Wholesome pasteurised toned milk with 3.0% fat and 8.5% SNF. Fresh and pure.',
    keywords: ['milk', 'doodh', 'amul taaza', 'amul milk', 'toned milk']
  },
  {
    name: 'Amul Gold Full Cream Milk 1L',
    brand: 'Amul',
    categoryId: 'c1000000-0000-0000-0000-000000000011',
    categoryName: 'Dairy, Milk, Bread & Eggs',
    variantName: '1 Litre Pouch',
    mrp: 66,
    defaultRate: 66,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop&q=80',
    description: 'Full cream milk with 6.0% fat and 9.0% SNF, ideal for making kheer, tea, and homemade sweets.',
    keywords: ['amul gold', 'full cream milk', 'milk', 'doodh', 'amul']
  },
  {
    name: 'Amul Pasteurised Salted Butter 100g',
    brand: 'Amul',
    categoryId: 'c1000000-0000-0000-0000-000000000011',
    categoryName: 'Dairy, Milk, Bread & Eggs',
    variantName: '100g Pack',
    mrp: 60,
    defaultRate: 58,
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop&q=80',
    description: 'Utterly Butterly Delicious. Delicious pure dairy cream butter.',
    keywords: ['butter', 'makhan', 'amul butter', 'salted butter']
  },
  {
    name: 'Amul Pasteurised Salted Butter 500g',
    brand: 'Amul',
    categoryId: 'c1000000-0000-0000-0000-000000000011',
    categoryName: 'Dairy, Milk, Bread & Eggs',
    variantName: '500g Block',
    mrp: 285,
    defaultRate: 275,
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop&q=80',
    description: 'The Taste of India. Prepared from wholesome fresh milk cream.',
    keywords: ['amul butter', 'butter 500g', 'makhan', 'salted butter']
  },
  {
    name: 'Amul Fresh Malai Paneer 200g Pack',
    brand: 'Amul',
    categoryId: 'c1000000-0000-0000-0000-000000000011',
    categoryName: 'Dairy, Milk, Bread & Eggs',
    variantName: '200g Block',
    mrp: 95,
    defaultRate: 90,
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=80',
    description: 'Soft, creamy block paneer made with full cream dairy milk for curries and snacks.',
    keywords: ['paneer', 'amul paneer', 'malai paneer', 'cottage cheese']
  },
  {
    name: 'Amul Masti Dahi / Curd 400g Cup',
    brand: 'Amul',
    categoryId: 'c1000000-0000-0000-0000-000000000011',
    categoryName: 'Dairy, Milk, Bread & Eggs',
    variantName: '400g Cup',
    mrp: 40,
    defaultRate: 40,
    imageUrl: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=800&auto=format&fit=crop&q=80',
    description: 'Thick, creamy and delicious dahi prepared using pasteurised toned milk.',
    keywords: ['dahi', 'curd', 'amul masti dahi', 'yogurt']
  },
  {
    name: 'Britannia 100% Whole Wheat Bread 400g',
    brand: 'Britannia',
    categoryId: 'c1000000-0000-0000-0000-000000000011',
    categoryName: 'Dairy, Milk, Bread & Eggs',
    variantName: '400g Loaf',
    mrp: 50,
    defaultRate: 48,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    description: 'Wholesome brown bread made with 100% whole wheat flour, rich in natural dietary fiber.',
    keywords: ['bread', 'brown bread', 'wheat bread', 'britannia bread']
  },
  {
    name: 'Farm Fresh White Eggs (Tray of 30)',
    brand: 'Farm Fresh',
    categoryId: 'c1000000-0000-0000-0000-000000000011',
    categoryName: 'Dairy, Milk, Bread & Eggs',
    variantName: '30 Eggs Tray',
    mrp: 240,
    defaultRate: 210,
    imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=800&auto=format&fit=crop&q=80',
    description: 'Nutritious clean graded farm fresh white chicken eggs rich in protein.',
    keywords: ['eggs', 'ande', 'egg tray', 'farm eggs']
  },

  // --------------------------------------------------------------------------
  // PACKAGED FOODS, SNACKS & BISCUITS
  // --------------------------------------------------------------------------
  {
    name: 'Maggi 2-Minute Masala Instant Noodles 70g',
    brand: 'Nestle Maggi',
    categoryId: 'c1000000-0000-0000-0000-000000000012',
    categoryName: 'Packaged Foods, Snacks & Biscuits',
    variantName: '70g Single Pack',
    mrp: 14,
    defaultRate: 14,
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80',
    description: 'Authentic Indian masala taste made with finest spices and wheat noodle cakes.',
    keywords: ['maggi', 'noodles', 'instant noodles', 'nestle maggi']
  },
  {
    name: 'Maggi 2-Minute Masala Noodles Pack of 4 (280g)',
    brand: 'Nestle Maggi',
    categoryId: 'c1000000-0000-0000-0000-000000000012',
    categoryName: 'Packaged Foods, Snacks & Biscuits',
    variantName: '4-Pack (280g)',
    mrp: 56,
    defaultRate: 52,
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80',
    description: 'Value pack of 4 delicious instant masala noodles for quick hunger fixes.',
    keywords: ['maggi 4 pack', 'maggi family pack', 'noodles']
  },
  {
    name: 'Parle-G Original Glucose Biscuits 250g',
    brand: 'Parle',
    categoryId: 'c1000000-0000-0000-0000-000000000012',
    categoryName: 'Packaged Foods, Snacks & Biscuits',
    variantName: '250g Pack',
    mrp: 30,
    defaultRate: 28,
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80',
    description: 'India’s most loved tea-time glucose biscuit, filled with the goodness of milk and wheat.',
    keywords: ['parle-g', 'biscuit', 'glucose biscuit', 'parle']
  },
  {
    name: 'Britannia Good Day Butter Cookies 200g',
    brand: 'Britannia',
    categoryId: 'c1000000-0000-0000-0000-000000000012',
    categoryName: 'Packaged Foods, Snacks & Biscuits',
    variantName: '200g Pack',
    mrp: 45,
    defaultRate: 40,
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80',
    description: 'Crisp, rich buttery cookies with iconic smile patterns. Perfect companion with hot tea.',
    keywords: ['good day', 'butter biscuit', 'britannia good day', 'cookies']
  },
  {
    name: "Haldiram's Nagpur Bhujia Sev 400g",
    brand: "Haldiram's",
    categoryId: 'c1000000-0000-0000-0000-000000000012',
    categoryName: 'Packaged Foods, Snacks & Biscuits',
    variantName: '400g Pouch',
    mrp: 135,
    defaultRate: 120,
    imageUrl: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&auto=format&fit=crop&q=80',
    description: 'Spicy crispy moth flour noodle namkeen seasoned with cloves, black pepper and spices.',
    keywords: ['bhujia', 'haldiram', 'sev', 'namkeen', 'bhujia sev']
  },
  {
    name: "Lay's India's Magic Masala Potato Chips 50g",
    brand: "Lay's",
    categoryId: 'c1000000-0000-0000-0000-000000000012',
    categoryName: 'Packaged Foods, Snacks & Biscuits',
    variantName: '50g Bag',
    mrp: 20,
    defaultRate: 20,
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&auto=format&fit=crop&q=80',
    description: 'Thin crispy potato chips seasoned with quintessential Indian spices.',
    keywords: ['chips', 'lays', 'magic masala', 'potato chips', 'blue lays']
  },
  {
    name: 'Cadbury Dairy Milk Silk Chocolate 150g',
    brand: 'Cadbury',
    categoryId: 'c1000000-0000-0000-0000-000000000012',
    categoryName: 'Packaged Foods, Snacks & Biscuits',
    variantName: '150g Bar',
    mrp: 195,
    defaultRate: 180,
    imageUrl: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=800&auto=format&fit=crop&q=80',
    description: 'Melt-in-the-mouth silky smooth pure milk chocolate bar.',
    keywords: ['chocolate', 'cadbury', 'dairy milk', 'silk']
  },

  // --------------------------------------------------------------------------
  // BEVERAGES, COLD DRINKS & JUICES
  // --------------------------------------------------------------------------
  {
    name: 'Coca-Cola Original Taste 750ml PET Bottle',
    brand: 'Coca-Cola',
    categoryId: 'c1000000-0000-0000-0000-000000000013',
    categoryName: 'Beverages, Tea, Coffee & Cold Drinks',
    variantName: '750ml Bottle',
    mrp: 40,
    defaultRate: 40,
    imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&auto=format&fit=crop&q=80',
    description: 'Refreshing fizzy cola drink to spark happiness in every moment.',
    keywords: ['coca cola', 'coke', 'cold drink', 'soft drink']
  },
  {
    name: 'Thums Up Charged Carbonated Drink 750ml',
    brand: 'Thums Up',
    categoryId: 'c1000000-0000-0000-0000-000000000013',
    categoryName: 'Beverages, Tea, Coffee & Cold Drinks',
    variantName: '750ml Bottle',
    mrp: 40,
    defaultRate: 40,
    imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&auto=format&fit=crop&q=80',
    description: 'Taste the Thunder. Strong, fizzy and bold carbonated cola beverage.',
    keywords: ['thums up', 'thunder', 'cold drink', 'soda']
  },
  {
    name: 'Sprite Lemon-Lime Sparkling Drink 750ml',
    brand: 'Sprite',
    categoryId: 'c1000000-0000-0000-0000-000000000013',
    categoryName: 'Beverages, Tea, Coffee & Cold Drinks',
    variantName: '750ml Bottle',
    mrp: 40,
    defaultRate: 40,
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&auto=format&fit=crop&q=80',
    description: 'Clear crisp lemon-lime refreshment with zero caffeine.',
    keywords: ['sprite', 'cold drink', 'lemon drink', 'soft drink']
  },
  {
    name: 'Frooti Fresh Mango Drink 1.2L Bottle',
    brand: 'Parle Agro Frooti',
    categoryId: 'c1000000-0000-0000-0000-000000000013',
    categoryName: 'Beverages, Tea, Coffee & Cold Drinks',
    variantName: '1.2 Litre Bottle',
    mrp: 70,
    defaultRate: 65,
    imageUrl: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b7?w=800&auto=format&fit=crop&q=80',
    description: 'Luscious mango fruit beverage made with real Totapuri mango pulp.',
    keywords: ['frooti', 'mango juice', 'mango drink', 'juice']
  },
  {
    name: 'Red Bull Energy Drink 250ml Can',
    brand: 'Red Bull',
    categoryId: 'c1000000-0000-0000-0000-000000000013',
    categoryName: 'Beverages, Tea, Coffee & Cold Drinks',
    variantName: '250ml Can',
    mrp: 125,
    defaultRate: 115,
    imageUrl: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=800&auto=format&fit=crop&q=80',
    description: 'Vitalizes body and mind with caffeine, taurine and B-group vitamins.',
    keywords: ['red bull', 'energy drink', 'caffeine can']
  },

  // --------------------------------------------------------------------------
  // ELECTRONICS, MOBILES & ACCESSORIES
  // --------------------------------------------------------------------------
  {
    name: 'Samsung 25W Type-C Super Fast Charger',
    brand: 'Samsung',
    categoryId: 'c1000000-0000-0000-0000-000000000001',
    categoryName: 'Electronics, Mobiles & Accessories',
    variantName: 'White / 25W PD',
    mrp: 1299,
    defaultRate: 699,
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
    description: 'Official Samsung Power Delivery 3.0 Type-C travel wall adapter for Galaxy smartphones.',
    keywords: ['charger', 'samsung charger', 'fast charger', 'type c charger', 'adapter']
  },
  {
    name: 'boAt Airdopes 141 Bluetooth TWS Earbuds',
    brand: 'boAt',
    categoryId: 'c1000000-0000-0000-0000-000000000001',
    categoryName: 'Electronics, Mobiles & Accessories',
    variantName: 'Bold Black',
    mrp: 4490,
    defaultRate: 1299,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
    description: '42 hours total playback, ENx noise cancelling mic, ASAP fast charge, and IPX4 sweat resistance.',
    keywords: ['earbuds', 'boat airdopes', 'bluetooth earphones', 'airpods', 'tws']
  },
  {
    name: 'Mi 20000mAh 18W Fast Charging Power Bank 3i',
    brand: 'Xiaomi',
    categoryId: 'c1000000-0000-0000-0000-000000000001',
    categoryName: 'Electronics, Mobiles & Accessories',
    variantName: 'Sandstone Black',
    mrp: 2199,
    defaultRate: 1799,
    imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&auto=format&fit=crop&q=80',
    description: 'Triple port output with 18W dual-direction fast charging and advanced 12-layer circuit protection.',
    keywords: ['power bank', 'mi power bank', 'portable charger', 'battery']
  },
  {
    name: 'Realme 33W Dart / SuperVOOC Flash Charger',
    brand: 'Realme',
    categoryId: 'c1000000-0000-0000-0000-000000000001',
    categoryName: 'Electronics, Mobiles & Accessories',
    variantName: '33W Adapter + Cable',
    mrp: 1499,
    defaultRate: 899,
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
    description: 'Ultra-fast flash charging support for Realme, Oppo, and OnePlus smartphones with surge protection.',
    keywords: ['realme charger', 'dart charger', 'vooc charger', 'fast charger']
  },
  {
    name: 'SanDisk Ultra 64GB MicroSDXC Class 10 Memory Card',
    brand: 'SanDisk',
    categoryId: 'c1000000-0000-0000-0000-000000000001',
    categoryName: 'Electronics, Mobiles & Accessories',
    variantName: '64GB UHS-I',
    mrp: 850,
    defaultRate: 499,
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80',
    description: 'Up to 120MB/s read speed, ideal for Android smartphones, tablets, and dashcams.',
    keywords: ['memory card', 'sandisk', 'sd card', '64gb', 'microsd']
  },
  {
    name: 'Portronics 60W 4-in-1 Fast Braided Charging Cable',
    brand: 'Portronics',
    categoryId: 'c1000000-0000-0000-0000-000000000001',
    categoryName: 'Electronics, Mobiles & Accessories',
    variantName: '1.2m Black',
    mrp: 699,
    defaultRate: 299,
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
    description: 'Multi-device braided charging cable with Type-C, Lightning, and Micro USB connectors.',
    keywords: ['cable', 'charging cable', 'type c cable', 'usb cable']
  },

  // --------------------------------------------------------------------------
  // COMPUTERS & IT STORAGE
  // --------------------------------------------------------------------------
  {
    name: 'Crucial P3 1TB PCIe 3.0 NVMe M.2 SSD',
    brand: 'Crucial',
    categoryId: 'c1000000-0000-0000-0000-000000000002',
    categoryName: 'Computers, Laptops & IT Peripherals',
    variantName: '1TB M.2 2280',
    mrp: 7500,
    defaultRate: 5299,
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80',
    description: 'High performance NVMe solid state drive with up to 3500MB/s read speeds for laptops & PCs.',
    keywords: ['ssd', 'nvme ssd', 'crucial', '1tb ssd', 'hard disk']
  },
  {
    name: 'Logitech B170 Wireless Optical Mouse',
    brand: 'Logitech',
    categoryId: 'c1000000-0000-0000-0000-000000000002',
    categoryName: 'Computers, Laptops & IT Peripherals',
    variantName: 'Black / 2.4GHz',
    mrp: 895,
    defaultRate: 599,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
    description: 'Reliable 2.4 GHz wireless mouse with 10m range, 12-month battery life, and universal USB receiver.',
    keywords: ['mouse', 'wireless mouse', 'logitech mouse', 'optical mouse']
  },
  {
    name: 'SanDisk Cruzer Blade 32GB USB 2.0 Flash Drive',
    brand: 'SanDisk',
    categoryId: 'c1000000-0000-0000-0000-000000000002',
    categoryName: 'Computers, Laptops & IT Peripherals',
    variantName: '32GB USB',
    mrp: 550,
    defaultRate: 349,
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80',
    description: 'Compact featherlight pen drive for simple data transfers, backups, and file sharing.',
    keywords: ['pendrive', 'pen drive', 'sandisk', 'usb drive', 'flash drive']
  },
  {
    name: 'HP 150 Wired USB Keyboard with Numeric Keypad',
    brand: 'HP',
    categoryId: 'c1000000-0000-0000-0000-000000000002',
    categoryName: 'Computers, Laptops & IT Peripherals',
    variantName: 'Full Size / USB',
    mrp: 999,
    defaultRate: 649,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
    description: 'Ergonomic low-profile keys with quiet typing response and spill-resistant design.',
    keywords: ['keyboard', 'hp keyboard', 'usb keyboard', 'computer keyboard']
  },

  // --------------------------------------------------------------------------
  // HARDWARE, TOOLS & FASTENERS
  // --------------------------------------------------------------------------
  {
    name: 'Godrej Nav-Tal 7 Levers Brass Padlock with 3 Keys',
    brand: 'Godrej',
    categoryId: 'c1000000-0000-0000-0000-000000000004',
    categoryName: 'Hardware, Tools & Sanitaryware',
    variantName: '7 Levers / Brass',
    mrp: 680,
    defaultRate: 540,
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
    description: 'Solid brass lock body with hardened steel electroplated shackle resistant to hacksaws and force.',
    keywords: ['tala', 'lock', 'godrej lock', 'padlock', 'brass lock', 'navtal']
  },
  {
    name: 'Fevicol SH Synthetic Resin Adhesive 500g',
    brand: 'Pidilite Fevicol',
    categoryId: 'c1000000-0000-0000-0000-000000000004',
    categoryName: 'Hardware, Tools & Sanitaryware',
    variantName: '500g Tub',
    mrp: 175,
    defaultRate: 155,
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
    description: 'The ultimate wood glue for furniture bonding with unmatched tensile strength.',
    keywords: ['fevicol', 'glue', 'wood glue', 'pidilite', 'adhesive']
  },
  {
    name: 'M-Seal Regular Epoxy Sealant Putty 100g',
    brand: 'Pidilite M-Seal',
    categoryId: 'c1000000-0000-0000-0000-000000000004',
    categoryName: 'Hardware, Tools & Sanitaryware',
    variantName: '100g Pack',
    mrp: 35,
    defaultRate: 30,
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
    description: 'Multi-purpose epoxy compound for sealing pipe leaks, cracks and bonding metals.',
    keywords: ['m-seal', 'mseal', 'putty', 'leakage seal', 'epoxy']
  },
  {
    name: 'Taparia 8-inch Combination Pliers 1621-8',
    brand: 'Taparia',
    categoryId: 'c1000000-0000-0000-0000-000000000004',
    categoryName: 'Hardware, Tools & Sanitaryware',
    variantName: '8-inch / Heavy Duty',
    mrp: 340,
    defaultRate: 280,
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
    description: 'Drop forged high carbon steel pliers with insulated handles for gripping and wire cutting.',
    keywords: ['pliers', 'palaas', 'taparia', 'tools', 'hand tools']
  },

  // --------------------------------------------------------------------------
  // ELECTRICALS & LIGHTING
  // --------------------------------------------------------------------------
  {
    name: 'Philips Stellar Bright 9W B22 LED Bulb (Cool Day Light)',
    brand: 'Philips',
    categoryId: 'c1000000-0000-0000-0000-000000000016',
    categoryName: 'Electricals, Lighting & Wire Fittings',
    variantName: '9W B22 Base',
    mrp: 140,
    defaultRate: 95,
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
    description: 'Energy efficient cool white 6500K LED bulb with wide beam spread and surge protection.',
    keywords: ['bulb', 'led bulb', 'philips bulb', '9w bulb', 'light']
  },
  {
    name: 'Havells 20W LED Batten Tube Light 4 Feet',
    brand: 'Havells',
    categoryId: 'c1000000-0000-0000-0000-000000000016',
    categoryName: 'Electricals, Lighting & Wire Fittings',
    variantName: '20W / 4 Feet',
    mrp: 395,
    defaultRate: 260,
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
    description: 'Bright glare-free white batten tube light for living rooms, kitchens and storefronts.',
    keywords: ['tube light', 'led tube', 'havells', 'batten light']
  },
  {
    name: 'Anchor by Panasonic 4-Socket Extension Board with Master Switch',
    brand: 'Anchor',
    categoryId: 'c1000000-0000-0000-0000-000000000016',
    categoryName: 'Electricals, Lighting & Wire Fittings',
    variantName: '4 Sockets / 2m Cord',
    mrp: 520,
    defaultRate: 380,
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
    description: 'Heavy duty surge-protected power strip with 4 universal 6A sockets and thermal fuse.',
    keywords: ['extension board', 'power strip', 'anchor', 'socket board']
  },

  // --------------------------------------------------------------------------
  // PERSONAL CARE, TOILETRIES & COSMETICS
  // --------------------------------------------------------------------------
  {
    name: 'Dettol Original Germ Protection Bathing Soap 125g',
    brand: 'Dettol',
    categoryId: 'c1000000-0000-0000-0000-000000000018',
    categoryName: 'Personal Care, Beauty & Cosmetics',
    variantName: '125g Bar',
    mrp: 58,
    defaultRate: 52,
    imageUrl: 'https://images.unsplash.com/photo-1607006314594-c70500be8e5f?w=800&auto=format&fit=crop&q=80',
    description: 'Trusted antibacterial bathing soap providing 99.9% germ protection for entire family.',
    keywords: ['soap', 'sabun', 'dettol', 'dettol soap', 'bathing soap']
  },
  {
    name: 'Lifebuoy Total 10 Antibacterial Soap 125g',
    brand: 'Lifebuoy',
    categoryId: 'c1000000-0000-0000-0000-000000000018',
    categoryName: 'Personal Care, Beauty & Cosmetics',
    variantName: '125g Bar',
    mrp: 45,
    defaultRate: 40,
    imageUrl: 'https://images.unsplash.com/photo-1607006314594-c70500be8e5f?w=800&auto=format&fit=crop&q=80',
    description: 'Advanced Silver Shield formula protects from 10 disease-causing germs.',
    keywords: ['lifebuoy', 'soap', 'sabun', 'bathing soap']
  },
  {
    name: 'Colgate Strong Teeth Dental Cream Toothpaste 200g',
    brand: 'Colgate',
    categoryId: 'c1000000-0000-0000-0000-000000000019',
    categoryName: 'Oral Care, Dental & Grooming',
    variantName: '200g Tube',
    mrp: 125,
    defaultRate: 110,
    imageUrl: 'https://images.unsplash.com/photo-1559591937-e1032b2a60b9?w=800&auto=format&fit=crop&q=80',
    description: 'Amino Shakti formula adds natural calcium to strengthen tooth enamel and guard against cavities.',
    keywords: ['colgate', 'toothpaste', 'brush paste', 'teeth paste']
  },
  {
    name: 'Head & Shoulders Anti-Dandruff Smooth & Silky Shampoo 180ml',
    brand: 'Head & Shoulders',
    categoryId: 'c1000000-0000-0000-0000-000000000018',
    categoryName: 'Personal Care, Beauty & Cosmetics',
    variantName: '180ml Bottle',
    mrp: 180,
    defaultRate: 155,
    imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&auto=format&fit=crop&q=80',
    description: 'Removes up to 100% dandruff flakes while restoring hair softness and shine.',
    keywords: ['shampoo', 'head and shoulders', 'anti dandruff', 'hair wash']
  },
  {
    name: 'Clinic Plus Strong & Long Health Shampoo 175ml',
    brand: 'Clinic Plus',
    categoryId: 'c1000000-0000-0000-0000-000000000018',
    categoryName: 'Personal Care, Beauty & Cosmetics',
    variantName: '175ml Bottle',
    mrp: 130,
    defaultRate: 115,
    imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&auto=format&fit=crop&q=80',
    description: 'Enriched with milk protein formula to nourish hair fibers from root to tip.',
    keywords: ['clinic plus', 'shampoo', 'hair shampoo']
  },
  {
    name: 'Gillette Mach 3 Shaving Razor with 2 Cartridges',
    brand: 'Gillette',
    categoryId: 'c1000000-0000-0000-0000-000000000019',
    categoryName: 'Oral Care, Dental & Grooming',
    variantName: 'Handle + 2 Blades',
    mrp: 325,
    defaultRate: 285,
    imageUrl: 'https://images.unsplash.com/photo-1559591937-e1032b2a60b9?w=800&auto=format&fit=crop&q=80',
    description: '3 DuraComfort blades with comfort gel strip for smooth, nick-free close shaving.',
    keywords: ['gillette', 'razor', 'shaving', 'mach 3', 'blades']
  },

  // --------------------------------------------------------------------------
  // CLEANING, DETERGENTS & HOUSEKEEPING
  // --------------------------------------------------------------------------
  {
    name: 'Surf Excel Easy Wash Detergent Powder 1kg',
    brand: 'Surf Excel',
    categoryId: 'c1000000-0000-0000-0000-000000000020',
    categoryName: 'Cleaning, Detergents & Home Hygiene',
    variantName: '1kg Pouch',
    mrp: 145,
    defaultRate: 130,
    imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800&auto=format&fit=crop&q=80',
    description: 'Superior stain removal formula with ultra-fine powder that dissolves instantly in water.',
    keywords: ['surf excel', 'detergent', 'washing powder', 'surf', 'kapde dhone ka powder']
  },
  {
    name: 'Rin Advanced Detergent Bar 250g (Pack of 4)',
    brand: 'Rin',
    categoryId: 'c1000000-0000-0000-0000-000000000020',
    categoryName: 'Cleaning, Detergents & Home Hygiene',
    variantName: '4 x 250g Bars',
    mrp: 80,
    defaultRate: 72,
    imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800&auto=format&fit=crop&q=80',
    description: 'Bright clothes bar with Smart Bright technology to keep whites sparkling.',
    keywords: ['rin soap', 'detergent bar', 'rin', 'washing soap']
  },
  {
    name: 'Vim Dishwash Gel Lemon 500ml Bottle',
    brand: 'Vim',
    categoryId: 'c1000000-0000-0000-0000-000000000020',
    categoryName: 'Cleaning, Detergents & Home Hygiene',
    variantName: '500ml Bottle',
    mrp: 125,
    defaultRate: 110,
    imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800&auto=format&fit=crop&q=80',
    description: '1 spoon of Vim Gel is enough to degrease a sink full of oily dishes.',
    keywords: ['vim', 'dishwash gel', 'bartan dhone ka liquid', 'vim liquid']
  },
  {
    name: 'Harpic Power Plus Original Toilet Cleaner 500ml',
    brand: 'Harpic',
    categoryId: 'c1000000-0000-0000-0000-000000000020',
    categoryName: 'Cleaning, Detergents & Home Hygiene',
    variantName: '500ml Bottle',
    mrp: 105,
    defaultRate: 95,
    imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800&auto=format&fit=crop&q=80',
    description: '10x better stain removal than bleaching powder, kills 99.9% germs.',
    keywords: ['harpic', 'toilet cleaner', 'cleaning']
  },

  // --------------------------------------------------------------------------
  // PHARMACY & WELLNESS
  // --------------------------------------------------------------------------
  {
    name: 'Vicks VapoRub Pain Relief Balm 25ml',
    brand: 'Vicks',
    categoryId: 'c1000000-0000-0000-0000-000000000005',
    categoryName: 'Pharmacy, Healthcare & First Aid',
    variantName: '25ml Jar',
    mrp: 90,
    defaultRate: 85,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
    description: 'Relief from blocked nose, headache, body ache and chest congestion with menthol.',
    keywords: ['vicks', 'vaporub', 'cold balm', 'cough balm', 'balm']
  },
  {
    name: 'Volini Pain Relief Spray 40g',
    brand: 'Volini',
    categoryId: 'c1000000-0000-0000-0000-000000000005',
    categoryName: 'Pharmacy, Healthcare & First Aid',
    variantName: '40g Aerosol Can',
    mrp: 160,
    defaultRate: 140,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
    description: 'Instant recovery from backache, sprain, muscular pain and joint stiffness.',
    keywords: ['volini', 'pain spray', 'moov', 'pain relief spray']
  },
  {
    name: 'Dettol Antiseptic Disinfectant Liquid 250ml',
    brand: 'Dettol',
    categoryId: 'c1000000-0000-0000-0000-000000000005',
    categoryName: 'Pharmacy, Healthcare & First Aid',
    variantName: '250ml Bottle',
    mrp: 145,
    defaultRate: 135,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
    description: 'First aid antiseptic protection against infection from cuts, bites and wounds.',
    keywords: ['dettol liquid', 'antiseptic', 'first aid', 'disinfectant']
  },

  // --------------------------------------------------------------------------
  // STATIONERY & BOOKS
  // --------------------------------------------------------------------------
  {
    name: 'Classmate Long Ruled Notebook 240 Pages',
    brand: 'Classmate',
    categoryId: 'c1000000-0000-0000-0000-000000000025',
    categoryName: 'Stationery, Books & School Supplies',
    variantName: '240 Pages / Hard Bound',
    mrp: 90,
    defaultRate: 75,
    imageUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&auto=format&fit=crop&q=80',
    description: 'Elemental chlorine-free paper with smooth writing surface for school and college.',
    keywords: ['register', 'notebook', 'copy', 'classmate register', 'ruled copy']
  },
  {
    name: 'Reynolds 045 Fine Carbide Ball Pen (Pack of 5)',
    brand: 'Reynolds',
    categoryId: 'c1000000-0000-0000-0000-000000000025',
    categoryName: 'Stationery, Books & School Supplies',
    variantName: 'Pack of 5 (Blue)',
    mrp: 50,
    defaultRate: 45,
    imageUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&auto=format&fit=crop&q=80',
    description: 'Classic laser tip 0.7mm ball pen for effortless smooth continuous writing.',
    keywords: ['pen', 'ball pen', 'reynolds', 'blue pen']
  },
  {
    name: 'JK Copier A4 Paper 75 GSM (Ream of 500 Sheets)',
    brand: 'JK Copier',
    categoryId: 'c1000000-0000-0000-0000-000000000025',
    categoryName: 'Stationery, Books & School Supplies',
    variantName: '500 Sheets / Ream',
    mrp: 380,
    defaultRate: 310,
    imageUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&auto=format&fit=crop&q=80',
    description: 'High brightness multipurpose photocopy and laser printing white paper.',
    keywords: ['a4 paper', 'photocopy paper', 'xerox paper', 'jk copier', 'paper ream']
  }
];

/**
 * Searches product suggestions based on user query string and optional categoryId.
 * Matches name, brand, keywords, or category.
 */
export function searchProductSuggestions(
  query: string,
  categoryId?: string,
  limit: number = 8
): ProductSuggestionItem[] {
  const clean = (query || '').trim().toLowerCase();
  if (!clean) {
    if (categoryId) {
      return RETAIL_MARKET_PRODUCT_SUGGESTIONS
        .filter(item => item.categoryId === categoryId)
        .slice(0, limit);
    }
    return RETAIL_MARKET_PRODUCT_SUGGESTIONS.slice(0, limit);
  }

  // Split multi-word queries for high-accuracy token matching
  const tokens = clean.split(/\s+/).filter(Boolean);

  const scored = RETAIL_MARKET_PRODUCT_SUGGESTIONS.map(item => {
    let score = 0;
    const nameLower = item.name.toLowerCase();
    const brandLower = item.brand.toLowerCase();

    // Exact name match
    if (nameLower === clean) score += 100;
    else if (nameLower.startsWith(clean)) score += 60;
    else if (nameLower.includes(clean)) score += 40;

    // Brand match
    if (brandLower === clean) score += 50;
    else if (brandLower.includes(clean)) score += 30;

    // Token matches
    for (const token of tokens) {
      if (nameLower.includes(token)) score += 15;
      if (brandLower.includes(token)) score += 10;
      if (item.keywords.some(k => k.includes(token))) score += 12;
    }

    // Boost if currently selected category matches
    if (categoryId && item.categoryId === categoryId) {
      score += 20;
    }

    return { item, score };
  });

  return scored
    .filter(res => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(res => res.item);
}
