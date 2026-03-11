// data.js — Shared product data for ALL STAR MOTOR SHOP

export const products = [
  { id: 1,  name: 'Alloy Mags / Rims',        price: 8500,  category: 'parts', tags: ['parts', 'wheels'],      badge: null,  soldOut: false, image: '/public/Mags.jpg',         description: 'Lightweight alloy mag wheels for scooters and underbone motorcycles. Reduces unsprung weight for sharper handling and a cleaner street look.', specs: { Type: 'Alloy Mag Wheel', Finish: 'Polished / Painted', Compatibility: 'Most scooters & underbones', 'Sold as': 'Per piece' } },
  { id: 2,  name: 'Tire',                      price: 1100,  category: 'parts', tags: ['parts', 'wheels'],      badge: null,  soldOut: false, image: '/public/Tire.jpg',         description: 'All-season motorcycle tire with multi-compound tread for balanced grip in wet and dry conditions.', specs: { Type: 'Tubeless / Tube-type', Sizes: '70/90-14 · 80/90-17 · 90/90-17', Pattern: 'Multi-compound all-season', 'Speed rating': 'Standard' } },
  { id: 3,  name: 'Drive Chain',               price: 850,   category: 'parts', tags: ['parts', 'transmission'],badge: null,  soldOut: false, image: '/public/Drive Chain.jpg',  description: 'Heavy-duty O-ring sealed drive chain for manual transmission motorcycles.', specs: { Type: 'O-Ring Chain', Links: '110 / 120 links', 'Chain size': '428 / 520 (specify)', Material: 'Hardened steel' } },
  { id: 4,  name: 'Drive Belt',                price: 650,   category: 'parts', tags: ['parts', 'transmission'],badge: null,  soldOut: false, image: '/public/Belt.jpg',         description: 'High-quality CVT drive belt for scooters and automatic motorcycles.', specs: { Type: 'CVT Drive Belt', Material: 'Reinforced rubber composite', Fit: 'Model-specific', 'Replace every': '15,000 km' } },
  { id: 5,  name: 'Sprocket',                  price: 480,   category: 'parts', tags: ['parts', 'transmission'],badge: null,  soldOut: false, image: '/public/Sprocket.png',     description: 'Hardened steel sprocket for front or rear fitment.', specs: { Material: 'Hardened steel', Teeth: '13T–16T front / 36T–52T rear', Finish: 'Black oxide', 'Chain size': '428 / 520' } },
  { id: 6,  name: 'Brake Disc',                price: 1800,  category: 'parts', tags: ['parts', 'brakes'],      badge: null,  soldOut: false, image: '/public/Disc.jpg',         description: 'Slotted and drilled brake disc for improved wet-weather braking and heat dissipation.', specs: { Type: 'Slotted / Drilled', Material: 'Stainless Steel', Diameter: '220mm – 320mm', Thickness: 'Standard OEM' } },
  { id: 7,  name: 'Brake Caliper',             price: 3200,  category: 'parts', tags: ['parts', 'brakes'],      badge: null,  soldOut: false, image: '/public/Caliper.jpg',      description: 'OEM-style replacement brake caliper for disc brake motorcycles.', specs: { Type: 'Single / Dual Piston', Material: 'Aluminium alloy', Fit: 'Front or rear (specify)', Hardware: 'Included' } },
  { id: 8,  name: 'Brake Master Cylinder',     price: 1600,  category: 'parts', tags: ['parts', 'brakes'],      badge: null,  soldOut: false, image: '/public/Brake Master.jpg', description: 'Replacement brake master cylinder for hydraulic disc brake systems.', specs: { Bore: '12mm / 14mm', Mount: 'Handlebar clamp', Lever: 'Adjustable reach', Fluid: 'DOT 4' } },
  { id: 9,  name: 'Front Shock Absorber',      price: 3500,  category: 'parts', tags: ['parts', 'suspension'],  badge: null,  soldOut: false, image: '/public/Front shock.jpg',  description: 'Replacement front fork shock absorber. Restores factory suspension feel and ride comfort.', specs: { Type: 'Telescopic fork', Spring: 'Progressive rate', 'Sold as': 'Pair', Fit: 'Model-specific' } },
  { id: 10, name: 'Rear Shock Absorber',       price: 2800,  category: 'parts', tags: ['parts', 'suspension'],  badge: 'NEW', soldOut: false, image: '/public/REAR SHOCK.jpg',   description: 'Upgraded rear shock absorber for improved ride comfort and handling.', specs: { Type: 'Mono / Twin', Adjustment: 'Spring preload (5-step)', 'Sold as': 'Single or pair', Fit: 'Model-specific' } },
  { id: 11, name: 'Swingarm',                  price: 6500,  category: 'parts', tags: ['parts', 'suspension'],  badge: null,  soldOut: false, image: '/public/Swingarm.jpg',     description: 'Replacement or upgrade swingarm for scooter and underbone frames.', specs: { Material: 'Steel / Aluminium alloy', Finish: 'Powder coat / Chrome', Hardware: 'Pivot bolt and bearings included', Fit: 'Model-specific' } },
  { id: 12, name: 'Carburetor',                price: 1200,  category: 'parts', tags: ['parts', 'engine'],      badge: null,  soldOut: false, image: '/public/Carburetor.jpg',   description: 'OEM-spec replacement carburetor for carbureted motorcycle engines.', specs: { Type: 'Slide / CV', Bore: '24mm – 32mm', Needle: 'Adjustable clip position', Choke: 'Auto / manual', Fit: 'Model-specific' } },
  { id: 13, name: 'Fly Ball / CVT Roller',     price: 320,   category: 'parts', tags: ['parts', 'transmission'],badge: null,  soldOut: false, image: '/public/Fly Ball.jpg',     description: 'CVT fly ball / variator roller set for automatic scooters.', specs: { Type: 'Fly ball / roller', Weights: '8g / 10g / 12g / 14g', Material: 'Hardened resin / steel core', 'Sold as': 'Set of 6', Fit: 'Most CVT scooters' } },
  { id: 14, name: 'Performance Exhaust Pipe',  price: 4500,  category: 'parts', tags: ['parts', 'exhaust'],     badge: 'NEW', soldOut: false, image: '/public/Pipe.jpg',         description: 'Stainless steel performance exhaust pipe. Improves exhaust flow for better mid-range power.', specs: { Material: 'Stainless Steel', Finish: 'Chrome / Matte Black', Fit: 'Universal (check fitment)', Type: 'Slip-on / Full system' } },
  { id: 15, name: 'Seat',                      price: 900,   category: 'parts', tags: ['parts', 'bodywork'],    badge: null,  soldOut: false, image: '/public/Seat.jpg',         description: 'Replacement motorcycle seat with high-density foam for all-day riding comfort.', specs: { Foam: 'High-density 35D', Cover: 'UV-resistant vinyl', Mount: 'OEM bolt-on', Color: 'Black (standard)', Fit: 'Model-specific' } },
  { id: 16, name: 'Helmet',                    price: 2500,  category: 'parts', tags: ['parts', 'gear', 'safety'],badge: 'NEW',soldOut: false, image: '/public/Helmet.jpg',       description: 'Full-face motorcycle helmet meeting safety standards.', specs: { Type: 'Full-face', Shell: 'ABS', Visor: 'Anti-scratch, UV-coated', Ventilation: 'Multi-channel', Sizes: 'S / M / L / XL' } },
];

// Tag-based sub-categories (what shows in the PARTS & GEAR dropdown)
export const tagCategories = [
  { tag: 'all',          label: 'ALL PARTS & GEAR' },
  { tag: 'wheels',       label: 'Wheels & Tires' },
  { tag: 'brakes',       label: 'Brakes' },
  { tag: 'suspension',   label: 'Suspension' },
  { tag: 'transmission', label: 'Drivetrain / Transmission' },
  { tag: 'engine',       label: 'Engine Parts' },
  { tag: 'exhaust',      label: 'Exhaust Systems' },
  { tag: 'bodywork',     label: 'Body & Seat' },
  { tag: 'gear',         label: 'Helmets & Gear' },
];

export const categories = [
  { id: 'parts', label: 'Parts & Accessories', icon: 'gear' },
];

export function getProductsByCategory(catId) {
  return products.filter(p => p.category === catId);
}

export function getProductsByTag(tag) {
  if (!tag || tag === 'all') return products.filter(p => p.category === 'parts');
  return products.filter(p => p.tags && p.tags.includes(tag));
}

export function getProductById(id) {
  return products.find(p => p.id === Number(id));
}

export function searchProducts(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    (p.tags && p.tags.some(t => t.includes(q))) ||
    (p.description && p.description.toLowerCase().includes(q))
  );
}
