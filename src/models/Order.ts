import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database.js";

export interface ShippingAddress {
  address: string;
  city: string;
  postcode?: string;
  country: string;
}

export class Order extends Model<
  InferAttributes<Order>,
  InferCreationAttributes<Order>
> {
  declare id: CreationOptional<string>;
  declare reference: string;
  declare customerName: string;
  declare customerEmail: string;
  declare customerPhone: string;
  declare shippingAddress: ShippingAddress;
  declare paymentMethod: "mobile_money" | "card";
  declare paymentProvider: string | null;
  declare paymentPhone: string | null;
  declare total: string;
  declare currency: CreationOptional<string>;
  declare status: CreationOptional<string>;
  declare paymentStatus: CreationOptional<string>;
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
    reference: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    customerName: { type: DataTypes.STRING(160), allowNull: false },
    customerEmail: { type: DataTypes.STRING(254), allowNull: false },
    customerPhone: { type: DataTypes.STRING(40), allowNull: false },
    shippingAddress: { type: DataTypes.JSONB, allowNull: false },
    paymentMethod: {
      type: DataTypes.ENUM("mobile_money", "card"),
      allowNull: false,
    },
    paymentProvider: { type: DataTypes.STRING(120), allowNull: true },
    paymentPhone: { type: DataTypes.STRING(40), allowNull: true },
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
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "orders" },
);
