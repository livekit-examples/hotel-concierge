export type MediaItem = {
  src: string;
  alt: string;
  label?: string;
  href?: string;
};

const roomImages = {
  harbor: {
    src: "/images/harbor-suite.png",
    alt: "Harbor suite with a king bed, warm lighting, and soft textiles.",
  },
  gallery: {
    src: "/images/gallery-loft.png",
    alt: "Gallery loft bedroom with curated art and a warm neutral palette.",
  },
  terrace: {
    src: "/images/terrace-residence.png",
    alt: "Terrace residence suite with modern furnishings and layered linens.",
  },
  penthouse: {
    src: "/images/lighthouse-penthouse.png",
    alt: "Penthouse bedroom with a dramatic wood ceiling and contemporary decor.",
  },
};

export const roomMedia: Record<
  string,
  { hero: MediaItem; gallery: MediaItem[] }
> = {
  "harbor-suite": {
    hero: roomImages.harbor,
    gallery: [roomImages.harbor, roomImages.gallery, roomImages.terrace],
  },
  "gallery-loft": {
    hero: roomImages.gallery,
    gallery: [roomImages.gallery, roomImages.harbor, roomImages.penthouse],
  },
  "terrace-residence": {
    hero: roomImages.terrace,
    gallery: [roomImages.terrace, roomImages.gallery, roomImages.harbor],
  },
  "lighthouse-penthouse": {
    hero: roomImages.penthouse,
    gallery: [roomImages.penthouse, roomImages.terrace, roomImages.harbor],
  },
};

export const amenityMedia = {
  gym: {
    src: "/images/gym.png",
    alt: "Modern hotel gym with treadmills and strength equipment.",
  },
  spa: {
    src: "/images/spa.png",
    alt: "Spa sauna room with warm lighting and wooden benches.",
  },
  vegetarian: {
    src: "/images/verdant-kitchen.png",
    alt: "Vegetarian restaurant with lush greenery and natural light.",
  },
  steakhouse: {
    src: "/images/brass-ember.png",
    alt: "Warm, multi-level steakhouse dining room with ambient lighting.",
  },
} satisfies Record<string, MediaItem>;

export const galleryItems: MediaItem[] = [
  {
    ...roomImages.harbor,
    label: "Harbor Suite",
    href: "/suites/harbor-suite",
  },
  {
    ...roomImages.gallery,
    label: "Gallery Loft",
    href: "/suites/gallery-loft",
  },
  {
    ...roomImages.terrace,
    label: "Terrace Residence",
    href: "/suites/terrace-residence",
  },
  {
    ...roomImages.penthouse,
    label: "Lighthouse Penthouse",
    href: "/suites/lighthouse-penthouse",
  },
  {
    ...amenityMedia.gym,
    label: "Aurum Gym",
    href: "/amenities/gym",
  },
  {
    ...amenityMedia.spa,
    label: "Solstice Spa",
    href: "/amenities/spa",
  },
  {
    ...amenityMedia.vegetarian,
    label: "Verdant Kitchen",
    href: "/dining/verdant-kitchen",
  },
  {
    ...amenityMedia.steakhouse,
    label: "Brass & Ember",
    href: "/dining/brass-ember",
  },
];
