import { Artist, Collection, Product } from "../models/index.js";

const image = (id: string, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;

const artistSeeds = [
  {
    slug: "amara-okafor",
    name: "Amara Okafor",
    location: "Lagos",
    medium: "Abstract painting and prints",
    bio: "Builds layered colour fields from memory and weather.",
    imageUrl: image("photo-1549490349-8643362247b5"),
  },
  {
    slug: "milo-hart",
    name: "Milo Hart",
    location: "London",
    medium: "Oil painting",
    bio: "Paints soft, geometric compositions in slow, thin layers.",
    imageUrl: image("photo-1579783902614-a3fb3927b6a5"),
  },
  {
    slug: "nia-wambui",
    name: "Nia Wambui",
    location: "Nairobi",
    medium: "Digital art",
    bio: "Explores light and form through generative digital work.",
    imageUrl: image("photo-1541701494587-cb58502866ab"),
  },
  {
    slug: "leah-kim",
    name: "Leah Kim",
    location: "Seoul",
    medium: "Painting",
    bio: "Makes quiet, restrained canvases about balance and space.",
    imageUrl: image("photo-1577083288073-40892c0860a4"),
  },
  {
    slug: "jon-bell",
    name: "Jon Bell",
    location: "Cape Town",
    medium: "Photography",
    bio: "Photographs the edges of the day, when the light turns.",
    imageUrl: image("photo-1541961017774-22349e4a1262"),
  },
];

const productSeeds = [
  {
    slug: "after-the-rain",
    title: "After the Rain",
    artistName: "Amara Okafor",
    type: "Limited edition print",
    category: "Abstract",
    price: "420.00",
    imageUrl: image("photo-1549490349-8643362247b5"),
  },
  {
    slug: "soft-geometry",
    title: "Soft Geometry",
    artistName: "Milo Hart",
    type: "Original painting",
    category: "Painting",
    price: "1850.00",
    imageUrl: image("photo-1579783902614-a3fb3927b6a5"),
  },
  {
    slug: "shape-of-light",
    title: "The Shape of Light",
    artistName: "Nia Wambui",
    type: "Digital artwork",
    category: "Digital",
    price: "180.00",
    imageUrl: image("photo-1541701494587-cb58502866ab"),
  },
  {
    slug: "quiet-forms",
    title: "Quiet Forms",
    artistName: "Leah Kim",
    type: "Original painting",
    category: "Painting",
    price: "920.00",
    imageUrl: image("photo-1577083288073-40892c0860a4"),
  },
  {
    slug: "blue-hour",
    title: "Blue Hour",
    artistName: "Jon Bell",
    type: "Limited edition print",
    category: "Photography",
    price: "280.00",
    imageUrl: image("photo-1541961017774-22349e4a1262"),
  },
  {
    slug: "sun-warmed",
    title: "Sun-Warmed",
    artistName: "Amara Okafor",
    type: "Original painting",
    category: "Abstract",
    price: "1240.00",
    imageUrl: image("photo-1549490349-8643362247b5"),
  },
];

const collectionSeeds = [
  {
    slug: "new-perspectives",
    title: "New perspectives",
    line: "The world, reframed.",
    description:
      "Work that changes how a familiar place, shape or light is seen — across photography, digital art and bold abstraction.",
    imageUrl: image("photo-1561214115-07c5d73e16b7", 1600),
    productSlugs: ["after-the-rain", "shape-of-light", "blue-hour"],
    displayOrder: 1,
  },
  {
    slug: "slow-looking",
    title: "Slow looking",
    line: "For rooms that breathe.",
    description:
      "Quiet, layered paintings that reward time. Chosen for calm spaces where a work can be lived with, not just noticed.",
    imageUrl: image("photo-1577083288073-40892c0860a4", 1600),
    productSlugs: ["quiet-forms", "soft-geometry"],
    displayOrder: 2,
  },
  {
    slug: "warm-abstractions",
    title: "Warm abstractions",
    line: "Colour with a pulse.",
    description:
      "Rich, sun-soaked abstraction that brings energy and warmth to a wall without asking for attention.",
    imageUrl: image("photo-1549490349-8643362247b5", 1600),
    productSlugs: ["sun-warmed", "after-the-rain"],
    displayOrder: 3,
  },
];

export async function seedCatalog(): Promise<void> {
  const artistsByName = new Map<string, Artist>();
  for (const artist of artistSeeds) {
    const [record] = await Artist.findOrCreate({
      where: { slug: artist.slug },
      defaults: artist,
    });
    artistsByName.set(record.name, record);
  }

  for (const product of productSeeds) {
    const artist = artistsByName.get(product.artistName);
    if (!artist) {
      throw new Error(`Missing seeded artist: ${product.artistName}`);
    }

    await Product.findOrCreate({
      where: { slug: product.slug },
      defaults: {
        slug: product.slug,
        title: product.title,
        artistId: artist.id,
        type: product.type,
        category: product.category,
        price: product.price,
        currency: "USD",
        imageUrl: product.imageUrl,
        description:
          "A considered work made to reward slow looking. Each piece is selected for its presence, materiality, and the story it carries into your space.",
      },
    });
  }

  for (const collection of collectionSeeds) {
    await Collection.findOrCreate({
      where: { slug: collection.slug },
      defaults: collection,
    });
  }
}
