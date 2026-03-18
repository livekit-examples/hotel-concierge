export type Hotel = {
  name: string;
  tagline: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  rating: number;
  reviewCount: number;
  checkIn: string;
  checkOut: string;
  currency: string;
};

export const hotel: Hotel = {
  name: "Aurum Atelier Hotel",
  tagline: "Artful stays with a coastal soul.",
  location: "Old Harbor District",
  address: "18 Meridian Quay, Seaport City, CA 94110",
  phone: "+1 (415) 555-0182",
  email: "reservations@aurumatelier.com",
  rating: 4.9,
  reviewCount: 412,
  checkIn: "3:00 PM",
  checkOut: "11:00 AM",
  currency: "USD",
};

export type Room = {
  id: string;
  name: string;
  description: string;
  sizeSqm: number;
  beds: string;
  occupancy: number;
  view: string;
  baseRate: number;
  inventory: number;
  amenities?: string[];
};

export type Amenity = {
  title: string;
  description: string;
  href?: string;
};

export type Experience = {
  title: string;
  description: string;
  duration: string;
  price: number;
};

export type PackageOffer = {
  name: string;
  description: string;
  highlight: string;
};

export type Testimonial = {
  quote: string;
  name: string;
  location: string;
};

export const rooms: Room[] = [
  {
    id: "harbor-suite",
    name: "Harbor Suite",
    description:
      "Corner suite with panoramic windows, hand-finished oak floors, and a private bar cart.",
    sizeSqm: 54,
    beds: "King bed",
    occupancy: 2,
    view: "Harbor skyline",
    baseRate: 520,
    inventory: 6,
    amenities: [
      "Nespresso station",
      "Rain shower",
      "Signature linen set",
      "Bluetooth speakers",
    ],
  },
  {
    id: "gallery-loft",
    name: "Gallery Loft",
    description:
      "A light-filled loft with curated art, matte brass fixtures, and a deep soaking tub.",
    sizeSqm: 48,
    beds: "King bed",
    occupancy: 2,
    view: "Courtyard gardens",
    baseRate: 460,
    inventory: 8,
    amenities: ["Soaking tub", "Smart lighting", "Mini bar", "Linen robe"],
  },
  {
    id: "terrace-residence",
    name: "Terrace Residence",
    description:
      "Indoor-outdoor suite with a private terrace, lounge seating, and custom minibar.",
    sizeSqm: 58,
    beds: "King bed",
    occupancy: 3,
    view: "Rooftop terrace",
    baseRate: 560,
    inventory: 4,
    amenities: ["Private terrace", "Lounge seating", "Mini bar", "Outdoor dining"],
  },
  {
    id: "lighthouse-penthouse",
    name: "Lighthouse Penthouse",
    description:
      "Two-level penthouse with panoramic windows, dining salon, and a skyline terrace.",
    sizeSqm: 92,
    beds: "King bed",
    occupancy: 4,
    view: "Coastal panorama",
    baseRate: 980,
    inventory: 1,
    amenities: ["Dining salon", "Terrace", "Private bar", "Signature service"],
  },
];

export const amenities: Amenity[] = [
  {
    title: "Aurum Gym",
    description: "Technogym circuit, recovery lounge, and skyline cardio decks.",
    href: "/amenities/gym",
  },
  {
    title: "Solstice Spa",
    description: "Mineral soak, cedar steam rooms, and signature body rituals.",
    href: "/amenities/spa",
  },
  {
    title: "Verdant Kitchen",
    description: "Vegetarian tasting menu with coastal produce and herbal pairings.",
    href: "/dining/verdant-kitchen",
  },
  {
    title: "Brass & Ember",
    description: "Modern steakhouse with open-fire grills and curated reds.",
    href: "/dining/brass-ember",
  },
  {
    title: "Rooftop Conservatory",
    description: "Sunset aperitifs with skyline views and a nightly string quartet.",
    href: "/amenities/rooftop",
  },
  {
    title: "Library Lounge",
    description: "Crafted cocktails, artisan teas, and vinyl listening stations.",
    href: "/amenities/lounge",
  },
];

export const experiences: Experience[] = [
  {
    title: "Harbor Sunrise Sail",
    description: "Private 90-minute sail with local pastries and press coffee.",
    duration: "90 min",
    price: 180,
  },
  {
    title: "Chef's Market Walk",
    description: "Guided stroll with the head chef and a cooking studio tasting.",
    duration: "2 hours",
    price: 140,
  },
  {
    title: "Atelier Evening",
    description: "Live jazz, candlelit cocktails, and an artist spotlight series.",
    duration: "3 hours",
    price: 95,
  },
];

export const packages: PackageOffer[] = [
  {
    name: "Weekend Escape",
    description: "Two nights, harbor breakfast, and late checkout.",
    highlight: "Save 15%",
  },
  {
    name: "Gallery Stay",
    description: "Suite upgrade, studio tour, and curated art prints.",
    highlight: "Exclusive access",
  },
  {
    name: "Wellness Ritual",
    description: "Sauna session, in-room bath ritual, and herbal tea set.",
    highlight: "Restore & renew",
  },
];

export const testimonials: Testimonial[] = [
  {
    quote:
      "The most thoughtful boutique stay we've had. Every detail felt tailored to us.",
    name: "Elena R.",
    location: "Seattle, WA",
  },
  {
    quote:
      "Immaculate design, warm service, and the rooftop at sunset is unforgettable.",
    name: "Marcus L.",
    location: "Austin, TX",
  },
  {
    quote:
      "A serene retreat in the middle of the city. We will be back.",
    name: "Priya K.",
    location: "New York, NY",
  },
];
