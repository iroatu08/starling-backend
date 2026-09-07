import { PackageType } from '@prisma/client';

/**
 * Package definition used when seeding experience destinations.
 */
export interface SeedPackage {
  name: string;
  type: PackageType;
  description: string;
  priceNgn: number;
  priceUsd: number;
  isRemovable: boolean;
}

/**
 * Review definition used when seeding experience destinations.
 */
export interface SeedReview {
  authorName: string;
  rating: number;
  body: string;
}

/**
 * Destination definition used when seeding experience catalog data.
 */
export interface SeedDestination {
  name: string;
  country: string;
  description: string;
  heroImageUrl: string;
  priceFromNgn: number;
  priceFromUsd: number;
  isFeatured: boolean;
  latitude: number;
  longitude: number;
  packages: SeedPackage[];
  reviews: SeedReview[];
}

/**
 * Brand-level testimonials surfaced on the homepage (also seeded per destination).
 */
export const BRAND_TESTIMONIALS: SeedReview[] = [
  {
    authorName: 'Starlings Guest',
    rating: 5,
    body:
      "Honestly, I didn't worry about a single thing. Starlings covered every detail, I literally just showed up and had fun. Best trip to London ever.",
  },
  {
    authorName: 'Starlings Guest',
    rating: 5,
    body:
      "They're too good at this! I hadn't even finished breakfast and my driver was already downstairs waiting for my next stop. The timing was insane.",
  },
];

/**
 * Standard hospitality package bundle shared across experience destinations.
 * Pricing is placeholder — edit via Admin after seeding.
 */
function buildStandardPackages(customActivity: {
  name: string;
  description: string;
  priceNgn: number;
  priceUsd: number;
}): SeedPackage[] {
  return [
    {
      name: 'Visa Processing',
      type: PackageType.VISA_PROCESSING,
      description: 'Priority visa processing and document support.',
      priceNgn: 55000,
      priceUsd: 68,
      isRemovable: false,
    },
    {
      name: 'Hotel Reservation',
      type: PackageType.HOTEL_RESERVATION,
      description: 'Curated accommodation booking with concierge support.',
      priceNgn: 165000,
      priceUsd: 200,
      isRemovable: true,
    },
    {
      name: 'Free Taxi at Destination',
      type: PackageType.FREE_TAXI,
      description: 'City transfer package from airport to hotel.',
      priceNgn: 0,
      priceUsd: 0,
      isRemovable: false,
    },
    {
      name: 'Airport Transfer Plus',
      type: PackageType.AIRPORT_TRANSFER,
      description: 'Luxury round-trip airport transfer add-on.',
      priceNgn: 38000,
      priceUsd: 46,
      isRemovable: true,
    },
    {
      name: customActivity.name,
      type: PackageType.CUSTOM,
      description: customActivity.description,
      priceNgn: customActivity.priceNgn,
      priceUsd: customActivity.priceUsd,
      isRemovable: true,
    },
  ];
}

/**
 * Experience catalog replacing the legacy Dubai-centric seed data.
 * Hero images are empty — upload lifestyle photos via Admin Gallery (Cloudinary).
 */
export const EXPERIENCE_DESTINATION_SEEDS: SeedDestination[] = [
  {
    name: 'Experience Abeokuta',
    country: 'Nigeria',
    description:
      'Walk ancient rock paths, taste local cuisine, and immerse yourself in Yoruba heritage — a curated Abeokuta experience built around culture, connection, and comfort.',
    heroImageUrl: '',
    priceFromNgn: 285000,
    priceFromUsd: 345,
    isFeatured: true,
    latitude: 7.1557,
    longitude: 3.3451,
    packages: buildStandardPackages({
      name: 'Olumo Rock & Cultural Tour',
      description: 'Guided heritage walk with local storytellers and artisan visits.',
      priceNgn: 95000,
      priceUsd: 115,
    }),
    reviews: BRAND_TESTIMONIALS,
  },
  {
    name: 'Experience Lagos',
    country: 'Nigeria',
    description:
      'From vibrant nightlife to beachfront brunches and art districts — experience Lagos the way locals live it, with every detail handled by your Starlings concierge.',
    heroImageUrl: '',
    priceFromNgn: 310000,
    priceFromUsd: 375,
    isFeatured: true,
    latitude: 6.5244,
    longitude: 3.3792,
    packages: buildStandardPackages({
      name: 'Lagos Lifestyle & Nightlife Tour',
      description: 'Curated day-to-night itinerary across Victoria Island, Lekki, and art hubs.',
      priceNgn: 110000,
      priceUsd: 133,
    }),
    reviews: BRAND_TESTIMONIALS,
  },
  {
    name: 'Experience Ghana',
    country: 'Ghana',
    description:
      'Discover Ghana through its people — market strolls, coastal escapes, and soulful cuisine. A hospitality-first journey designed to feel personal, not touristy.',
    heroImageUrl: '',
    priceFromNgn: 295000,
    priceFromUsd: 358,
    isFeatured: true,
    latitude: 5.6037,
    longitude: -0.187,
    packages: buildStandardPackages({
      name: 'Accra Culture & Coast Experience',
      description: 'Markets, music, and a curated coastal afternoon with local hosts.',
      priceNgn: 100000,
      priceUsd: 121,
    }),
    reviews: BRAND_TESTIMONIALS,
  },
  {
    name: 'Experience Ghana 2026',
    country: 'Ghana',
    description:
      'Our 2026 Ghana edition — expanded itineraries, new host partners, and deeper cultural immersion across Accra and beyond. Reserve early for priority concierge access.',
    heroImageUrl: '',
    priceFromNgn: 340000,
    priceFromUsd: 412,
    isFeatured: false,
    latitude: 5.6037,
    longitude: -0.187,
    packages: buildStandardPackages({
      name: 'Ghana 2026 Signature Immersion',
      description: 'Extended multi-day cultural program with exclusive host access.',
      priceNgn: 125000,
      priceUsd: 151,
    }),
    reviews: BRAND_TESTIMONIALS,
  },
  {
    name: 'Belfast',
    country: 'UK',
    description:
      'Explore Belfast through its stories, music, and waterfront — a welcoming UK experience with seamless transfers, curated dining, and concierge timing you can trust.',
    heroImageUrl: '',
    priceFromNgn: 420000,
    priceFromUsd: 510,
    isFeatured: false,
    latitude: 54.5973,
    longitude: -5.9301,
    packages: buildStandardPackages({
      name: 'Belfast Heritage & Waterfront Walk',
      description: 'Guided city experience blending history, food, and live music.',
      priceNgn: 130000,
      priceUsd: 157,
    }),
    reviews: BRAND_TESTIMONIALS,
  },
  {
    name: 'Brighton',
    country: 'UK',
    description:
      'Seaside charm meets creative energy — stroll the pier, discover independent boutiques, and enjoy Brighton at a relaxed, human pace with Starlings handling the logistics.',
    heroImageUrl: '',
    priceFromNgn: 400000,
    priceFromUsd: 485,
    isFeatured: false,
    latitude: 50.8225,
    longitude: -0.1372,
    packages: buildStandardPackages({
      name: 'Brighton Seaside & Lanes Experience',
      description: 'Coastal walk, pier highlights, and curated stops in The Lanes.',
      priceNgn: 120000,
      priceUsd: 145,
    }),
    reviews: BRAND_TESTIMONIALS,
  },
  {
    name: 'London',
    country: 'UK',
    description:
      'Show up and enjoy London — theatre, neighbourhoods, and iconic sights with a concierge who times every transfer perfectly so you never wait or worry.',
    heroImageUrl: '',
    priceFromNgn: 480000,
    priceFromUsd: 582,
    isFeatured: true,
    latitude: 51.5074,
    longitude: -0.1278,
    packages: buildStandardPackages({
      name: 'London Highlights & Neighbourhood Tour',
      description: 'Personalised day plans across Westminster, Soho, and hidden gems.',
      priceNgn: 145000,
      priceUsd: 175,
    }),
    reviews: BRAND_TESTIMONIALS,
  },
];
