import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../config/database.js";
import type { Product } from "./Product.js";

export class CartItem extends Model<
  InferAttributes<CartItem>,
  InferCreationAttributes<CartItem>
> {
  declare id: CreationOptional<string>;
  declare cartId: string;
  declare productSlug: string;
  declare quantity: number;
  declare product?: NonAttribute<Product | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CartItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cartId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "carts", key: "id" },
      onDelete: "CASCADE",
    },
    productSlug: {
      type: DataTypes.STRING(160),
      allowNull: false,
      references: { model: "products", key: "slug" },
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "cart_items",
    indexes: [{ unique: true, fields: ["cartId", "productSlug"] }],
  },
);
