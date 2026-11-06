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
  declare size: CreationOptional<string | null>;
  declare artistName: string;
  declare imageUrl: string;
  declare productKind: "physical" | "digital";
  declare quantity: number;
  declare unitPrice: string;
  declare digitalDeliveryStatus: CreationOptional<"pending" | "sent">;
  declare digitalDeliveryUrl: string | null;
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
    size: { type: DataTypes.STRING(120), allowNull: true },
    artistName: { type: DataTypes.STRING(160), allowNull: false },
    imageUrl: { type: DataTypes.TEXT, allowNull: false },
    productKind: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "physical",
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    digitalDeliveryStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    digitalDeliveryUrl: { type: DataTypes.TEXT, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "order_items" },
);
