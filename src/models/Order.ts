import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../config/database.js";
import type { OrderItem } from "./OrderItem.js";
import type { OrderNote } from "./OrderNote.js";
import type { OrderStatusHistory } from "./OrderStatusHistory.js";

export interface ShippingAddress {
  address: string;
  city: string;
  postcode?: string;
  country: string;
  instructions?: string;
}

export class Order extends Model<
  InferAttributes<Order>,
  InferCreationAttributes<Order>
> {
  declare id: CreationOptional<string>;
  declare userId: string | null;
  declare reference: string;
  declare checkoutKey: string | null;
  declare customerName: string;
  declare customerEmail: string;
  declare customerPhone: string;
  declare shippingAddress: ShippingAddress | null;
  declare subtotal: string;
  declare shippingCost: string;
  declare paymentMethod: "mobile_money" | "card";
  declare paymentProvider: string | null;
  declare paymentPhone: string | null;
  declare paymentReference: string | null;
  declare paymentUrl: string | null;
  declare total: string;
  declare currency: CreationOptional<string>;
  declare status: CreationOptional<string>;
  declare paymentStatus: CreationOptional<string>;
  declare trackingNumber: string | null;
  declare trackingUrl: string | null;
  declare shippedAt: Date | null;
  declare shippingNotes: string | null;
  declare items?: NonAttribute<OrderItem[]>;
  declare history?: NonAttribute<OrderStatusHistory[]>;
  declare notes?: NonAttribute<OrderNote[]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    reference: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    checkoutKey: { type: DataTypes.STRING(160), allowNull: true, unique: true },
    customerName: { type: DataTypes.STRING(160), allowNull: false },
    customerEmail: { type: DataTypes.STRING(254), allowNull: false },
    customerPhone: { type: DataTypes.STRING(40), allowNull: false },
    shippingAddress: { type: DataTypes.JSONB, allowNull: true },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    shippingCost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    paymentMethod: {
      type: DataTypes.ENUM("mobile_money", "card"),
      allowNull: false,
    },
    paymentProvider: { type: DataTypes.STRING(120), allowNull: true },
    paymentPhone: { type: DataTypes.STRING(40), allowNull: true },
    paymentReference: { type: DataTypes.STRING(80), allowNull: true },
    paymentUrl: { type: DataTypes.TEXT, allowNull: true },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "USD",
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "pending_payment",
    },
    paymentStatus: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "pending",
    },
    trackingNumber: { type: DataTypes.STRING(120), allowNull: true },
    trackingUrl: { type: DataTypes.TEXT, allowNull: true },
    shippedAt: { type: DataTypes.DATE, allowNull: true },
    shippingNotes: { type: DataTypes.TEXT, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "orders" },
);
