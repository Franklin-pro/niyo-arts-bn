import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../config/database.js";
import type { Artist } from "./Artist.js";

export class Product extends Model<
  InferAttributes<Product>,
  InferCreationAttributes<Product>
> {
  declare id: CreationOptional<string>;
  declare slug: string;
  declare title: string;
  declare artistId: string;
  declare type: string;
  declare category: string;
  declare price: string;
  declare currency: CreationOptional<string>;
  declare imageUrl: string;
  declare description: string;
  declare isActive: CreationOptional<boolean>;
  declare artist?: NonAttribute<Artist>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Product.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    artistId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "artists", key: "id" },
    },
    type: { type: DataTypes.STRING(120), allowNull: false },
    category: { type: DataTypes.STRING(80), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "USD",
    },
    imageUrl: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "products" },
);
