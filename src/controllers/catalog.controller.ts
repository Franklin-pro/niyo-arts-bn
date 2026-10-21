import { Op, Order as SequelizeOrder } from "sequelize";
import { Request, Response } from "express";
import { Artist, Collection, Product } from "../models/index.js";
import { HttpError } from "../utils/http-error.js";
import {
  productQuerySchema,
  slugParamSchema,
} from "../validators/catalog.validators.js";

function serializeProduct(product: Product) {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    artist: product.artist
      ? {
          slug: product.artist.slug,
          name: product.artist.name,
          location: product.artist.location,
          medium: product.artist.medium,
          imageUrl: product.artist.imageUrl,
        }
      : null,
    type: product.type,
    category: product.category,
    price: Number(product.price),
    currency: product.currency,
    imageUrl: product.imageUrl,
    description: product.description,
  };
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  const query = productQuerySchema.parse(req.query);
  const where = {
    isActive: true,
    ...(query.category && query.category.toLowerCase() !== "all"
      ? { category: { [Op.iLike]: query.category } }
      : {}),
    ...(query.q
      ? {
          [Op.or]: [
            { title: { [Op.iLike]: `%${query.q}%` } },
            { category: { [Op.iLike]: `%${query.q}%` } },
            { "$artist.name$": { [Op.iLike]: `%${query.q}%` } },
          ],
        }
      : {}),
  };
  const order: SequelizeOrder =
    query.sort === "price_asc"
      ? [["price", "ASC"]]
      : query.sort === "price_desc"
        ? [["price", "DESC"]]
        : [["createdAt", "ASC"]];

  const { count, rows } = await Product.findAndCountAll({
    where,
    include: [{ model: Artist, as: "artist", required: true }],
    order,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    distinct: true,
  });

  res.status(200).json({
    data: rows.map(serializeProduct),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: count,
      pages: Math.ceil(count / query.limit),
    },
  });
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  const product = await Product.findOne({
    where: { slug, isActive: true },
    include: [{ model: Artist, as: "artist", required: true }],
  });
  if (!product) throw new HttpError(404, "Artwork not found.");
  res.status(200).json({ data: serializeProduct(product) });
}

export async function listArtists(_req: Request, res: Response): Promise<void> {
  const artists = await Artist.findAll({ order: [["name", "ASC"]] });
  const products = await Product.findAll({
    where: { isActive: true },
    order: [["createdAt", "ASC"]],
  });
  const worksByArtist = new Map<string, Product[]>();
  for (const product of products) {
    const works = worksByArtist.get(product.artistId) || [];
    works.push(product);
    worksByArtist.set(product.artistId, works);
  }

  res.status(200).json({
    data: artists.map((artist) => {
      const works = worksByArtist.get(artist.id) || [];
      return {
        slug: artist.slug,
        name: artist.name,
        location: artist.location,
        medium: artist.medium,
        bio: artist.bio,
        imageUrl: artist.imageUrl,
        workCount: works.length,
        startingPrice: works.length
          ? Math.min(...works.map((work) => Number(work.price)))
          : null,
        products: works.map(serializeProduct),
      };
    }),
  });
}

export async function getArtist(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  const artist = await Artist.findOne({ where: { slug } });
  if (!artist) throw new HttpError(404, "Artist not found.");

  const products = await Product.findAll({
    where: { artistId: artist.id, isActive: true },
    include: [{ model: Artist, as: "artist", required: true }],
    order: [["createdAt", "ASC"]],
  });
  res.status(200).json({
    data: {
      slug: artist.slug,
      name: artist.name,
      location: artist.location,
      medium: artist.medium,
      bio: artist.bio,
      imageUrl: artist.imageUrl,
      products: products.map(serializeProduct),
    },
  });
}

export async function listCollections(
  _req: Request,
  res: Response,
): Promise<void> {
  const collections = await Collection.findAll({
    where: { isActive: true },
    order: [["displayOrder", "ASC"]],
  });
  const slugs = [...new Set(collections.flatMap((item) => item.productSlugs))];
  const products = await Product.findAll({
    where: { slug: { [Op.in]: slugs }, isActive: true },
    include: [{ model: Artist, as: "artist", required: true }],
  });
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  res.status(200).json({
    data: collections.map((collection) => ({
      slug: collection.slug,
      title: collection.title,
      line: collection.line,
      description: collection.description,
      imageUrl: collection.imageUrl,
      products: collection.productSlugs
        .map((slug) => productsBySlug.get(slug))
        .filter((product): product is Product => product !== undefined)
        .map(serializeProduct),
    })),
  });
}

export async function getCollection(
  req: Request,
  res: Response,
): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  const collection = await Collection.findOne({
    where: { slug, isActive: true },
  });
  if (!collection) throw new HttpError(404, "Collection not found.");

  const products = await Product.findAll({
    where: { slug: { [Op.in]: collection.productSlugs }, isActive: true },
    include: [{ model: Artist, as: "artist", required: true }],
  });
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  res.status(200).json({
    data: {
      slug: collection.slug,
      title: collection.title,
      line: collection.line,
      description: collection.description,
      imageUrl: collection.imageUrl,
      products: collection.productSlugs
        .map((productSlug) => productsBySlug.get(productSlug))
        .filter((product): product is Product => product !== undefined)
        .map(serializeProduct),
    },
  });
}
