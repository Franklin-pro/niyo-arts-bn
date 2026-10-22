import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../config/database.js";
import type { Order } from "./Order.js";

export class PaymentAttempt extends Model<
  InferAttributes<PaymentAttempt>,
  InferCreationAttributes<PaymentAttempt>
> {
  declare id: CreationOptional<string>;
  declare orderId: string;
  declare reference: string;
  declare paymentUrl: string;
  declare status: CreationOptional<"pending" | "successful" | "failed">;
  declare transactionId: string | null;
  declare order?: NonAttribute<Order>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

PaymentAttempt.init(
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
      onDelete: "CASCADE",
    },
    reference: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    paymentUrl: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "successful", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    transactionId: { type: DataTypes.STRING(80), allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "payment_attempts" },
);
