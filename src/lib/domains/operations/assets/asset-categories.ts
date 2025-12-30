/**
 * BCE Asset Category System
 * Format: BCE-[CAT]-[YY][SEQ]
 * Example: BCE-CP-25001 (1st Computing asset in 2025)
 */

export const ASSET_CATEGORIES = {
  CP: { code: 'CP', label: 'Computing', description: 'Laptops, desktops, servers, workstations, mini PCs, thin clients' },
  MO: { code: 'MO', label: 'Mobile Devices', description: 'Tablets, smartphones, e-readers, smartwatches, PDAs' },
  DP: { code: 'DP', label: 'Display', description: 'Monitors, televisions, projectors, digital signage, video walls' },
  AV: { code: 'AV', label: 'Audio Visual', description: 'Speakers, microphones, headsets, cameras, webcams, amplifiers' },
  NW: { code: 'NW', label: 'Networking', description: 'Routers, switches, access points, firewalls, modems, network racks' },
  PR: { code: 'PR', label: 'Peripherals', description: 'Mice, keyboards, webcams, docking stations, graphics tablets, barcode scanners' },
  CB: { code: 'CB', label: 'Cables & Connectors', description: 'HDMI, LAN, USB, DisplayPort, power cables, adapters, hubs' },
  ST: { code: 'ST', label: 'Storage Devices', description: 'External hard drives, NAS, USB flash drives, SD cards, tape drives' },
  PT: { code: 'PT', label: 'Printing', description: 'Printers, scanners, copiers, plotters, fax machines, label printers' },
  OF: { code: 'OF', label: 'Office Furniture', description: 'Desks, chairs, tables, shelving, cabinets, bookcases, reception counters' },
  OE: { code: 'OE', label: 'Office Equipment', description: 'Binding machines, laminators, shredders, whiteboards, projector screens, clocks' },
  AP: { code: 'AP', label: 'Appliances', description: 'Refrigerators, microwaves, coffee machines, water dispensers, air conditioners' },
  SF: { code: 'SF', label: 'Safety & Security', description: 'Fire extinguishers, first aid kits, CCTV cameras, alarms, safes, access control' },
  CL: { code: 'CL', label: 'Cleaning Equipment', description: 'Vacuums, air purifiers, floor scrubbers, pressure washers, steam cleaners' },
  VH: { code: 'VH', label: 'Vehicles', description: 'Cars, vans, trucks, motorcycles, scooters, bicycles, forklifts' },
  ME: { code: 'ME', label: 'Measurement Tools', description: 'Laser meters, tape measures, scales, thermometers, multimeters, levels' },
  SW: { code: 'SW', label: 'Software & SaaS', description: 'Operating systems, productivity suites, CRM, accounting, design, cloud subscriptions' },
  DG: { code: 'DG', label: 'Digital Assets', description: 'Domains, SSL certificates, trademarks, patents, copyrights, digital licenses' },
} as const;

export type AssetCategoryCode = keyof typeof ASSET_CATEGORIES;

export const CATEGORY_CODES = Object.keys(ASSET_CATEGORIES) as AssetCategoryCode[];

/**
 * Get category options for dropdown selects
 */
export function getCategoryOptions() {
  return Object.values(ASSET_CATEGORIES).map(cat => ({
    value: cat.code,
    label: `${cat.code} - ${cat.label}`,
    description: cat.description,
  }));
}

/**
 * Get category info by code
 */
export function getCategoryByCode(code: string) {
  return ASSET_CATEGORIES[code as AssetCategoryCode] || null;
}

/**
 * Asset type to category auto-mapping
 * Maps common asset type names to their category codes
 */
const TYPE_TO_CATEGORY_MAP: Record<string, AssetCategoryCode> = {
  // Computing (CP)
  'laptop': 'CP',
  'desktop': 'CP',
  'server': 'CP',
  'workstation': 'CP',
  'mini pc': 'CP',
  'thin client': 'CP',
  'computer': 'CP',
  'pc': 'CP',
  'macbook': 'CP',
  'imac': 'CP',

  // Mobile Devices (MO)
  'tablet': 'MO',
  'phone': 'MO',
  'smartphone': 'MO',
  'mobile': 'MO',
  'ipad': 'MO',
  'iphone': 'MO',
  'android': 'MO',
  'e-reader': 'MO',
  'smartwatch': 'MO',
  'pda': 'MO',

  // Display (DP)
  'monitor': 'DP',
  'display': 'DP',
  'screen': 'DP',
  'tv': 'DP',
  'television': 'DP',
  'digital signage': 'DP',
  'video wall': 'DP',

  // Audio Visual (AV)
  'headset': 'AV',
  'headphone': 'AV',
  'earphone': 'AV',
  'speaker': 'AV',
  'microphone': 'AV',
  'mic': 'AV',
  'camera': 'AV',
  'webcam': 'AV',
  'amplifier': 'AV',
  'audio': 'AV',
  'projector': 'AV',

  // Networking (NW)
  'router': 'NW',
  'switch': 'NW',
  'access point': 'NW',
  'firewall': 'NW',
  'modem': 'NW',
  'network': 'NW',
  'hub': 'NW',
  'wifi': 'NW',

  // Peripherals (PR)
  'mouse': 'PR',
  'keyboard': 'PR',
  'docking station': 'PR',
  'dock': 'PR',
  'graphics tablet': 'PR',
  'drawing tablet': 'PR',
  'barcode scanner': 'PR',
  'trackpad': 'PR',

  // Cables & Connectors (CB)
  'cable': 'CB',
  'hdmi': 'CB',
  'usb': 'CB',
  'adapter': 'CB',
  'connector': 'CB',
  'extension': 'CB',
  'charger': 'CB',
  'power cable': 'CB',

  // Storage Devices (ST)
  'hard drive': 'ST',
  'hdd': 'ST',
  'ssd': 'ST',
  'nas': 'ST',
  'usb drive': 'ST',
  'flash drive': 'ST',
  'pendrive': 'ST',
  'sd card': 'ST',
  'memory card': 'ST',
  'external drive': 'ST',
  'storage': 'ST',

  // Printing (PT)
  'printer': 'PT',
  'scanner': 'PT',
  'copier': 'PT',
  'plotter': 'PT',
  'fax': 'PT',
  'label printer': 'PT',
  'mfp': 'PT',

  // Office Furniture (OF)
  'desk': 'OF',
  'chair': 'OF',
  'table': 'OF',
  'shelving': 'OF',
  'shelf': 'OF',
  'cabinet': 'OF',
  'bookcase': 'OF',
  'reception': 'OF',
  'furniture': 'OF',
  'sofa': 'OF',
  'couch': 'OF',

  // Office Equipment (OE)
  'binding machine': 'OE',
  'laminator': 'OE',
  'shredder': 'OE',
  'whiteboard': 'OE',
  'projector screen': 'OE',
  'clock': 'OE',
  'stapler': 'OE',
  'paper cutter': 'OE',

  // Appliances (AP)
  'refrigerator': 'AP',
  'fridge': 'AP',
  'microwave': 'AP',
  'coffee machine': 'AP',
  'coffee maker': 'AP',
  'water dispenser': 'AP',
  'water cooler': 'AP',
  'air conditioner': 'AP',
  'ac': 'AP',
  'heater': 'AP',
  'fan': 'AP',
  'kettle': 'AP',
  'toaster': 'AP',
  'oven': 'AP',

  // Safety & Security (SF)
  'fire extinguisher': 'SF',
  'first aid': 'SF',
  'cctv': 'SF',
  'security camera': 'SF',
  'alarm': 'SF',
  'safe': 'SF',
  'access control': 'SF',
  'smoke detector': 'SF',

  // Cleaning Equipment (CL)
  'vacuum': 'CL',
  'air purifier': 'CL',
  'floor scrubber': 'CL',
  'pressure washer': 'CL',
  'steam cleaner': 'CL',
  'mop': 'CL',
  'cleaning': 'CL',

  // Vehicles (VH)
  'car': 'VH',
  'van': 'VH',
  'truck': 'VH',
  'motorcycle': 'VH',
  'scooter': 'VH',
  'bicycle': 'VH',
  'bike': 'VH',
  'forklift': 'VH',
  'vehicle': 'VH',

  // Measurement Tools (ME)
  'laser meter': 'ME',
  'tape measure': 'ME',
  'scale': 'ME',
  'thermometer': 'ME',
  'multimeter': 'ME',
  'level': 'ME',
  'measuring': 'ME',
  'meter': 'ME',
};

/**
 * Suggest a category based on asset type
 * Returns the category code or null if no match found
 */
export function suggestCategoryFromType(assetType: string): AssetCategoryCode | null {
  const normalizedType = assetType.toLowerCase().trim();

  // Direct match
  if (TYPE_TO_CATEGORY_MAP[normalizedType]) {
    return TYPE_TO_CATEGORY_MAP[normalizedType];
  }

  // Partial match - check if any key is contained in the type
  for (const [key, category] of Object.entries(TYPE_TO_CATEGORY_MAP)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return category;
    }
  }

  return null;
}

/**
 * Validate if a category code is valid
 */
export function isValidCategoryCode(code: string): code is AssetCategoryCode {
  return code in ASSET_CATEGORIES;
}
