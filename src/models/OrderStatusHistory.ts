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

export class OrderStatusHistory extends Model<
  InferAttributes<OrderStatusHistory>,
  InferCreationAttributes<OrderStatusHistory>
> {
  declare id: CreationOptional<string>;
  declare orderId: string;
  declare fromStatus: string | null;
  declare toStatus: string;
  declare actorUserId: string | null;
  declare detail: string | null;
  declare order?: NonAttribute<Order>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

OrderStatusHistory.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "orders", key: "id" },
      onDelete: "CASCADE",
    },
    fromStatus: { type: DataTypes.STRING(40), allowNull: true },
    toStatus: { type: DataTypes.STRING(40), allowNull: false },
    actorUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    detail: { type: DataTypes.TEXT, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "order_status_history" },
);
