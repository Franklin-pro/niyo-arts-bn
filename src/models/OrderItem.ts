import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database.js";

export class OrderItem extends Model<
  InferAttributes<OrderItem>,
  InferCreationAttributes<OrderItem>
> {
  declare id: CreationOptional<string>;
  declare orderId: string;
  declare productId: string | null;
  declare productSlug: string;
  declare title: string;
  declare artistName: string;
  declare imageUrl: string;
  declare quantity: number;
  declare unitPrice: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "orders", key: "id" },
    },
    productId: { type: DataTypes.UUID, allowNull: true },
    productSlug: { type: DataTypes.STRING(160), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    artistName: { type: DataTypes.STRING(160), allowNull: false },
    imageUrl: { type: DataTypes.TEXT, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "order_items" },
);
