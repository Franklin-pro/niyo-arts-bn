import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database.js";

export class EmailNotificationLog extends Model<
  InferAttributes<EmailNotificationLog>,
  InferCreationAttributes<EmailNotificationLog>
> {
  declare id: CreationOptional<string>;
  declare orderId: string | null;
  declare idempotencyKey: string;
  declare notificationType: string;
  declare recipient: string;
  declare status: CreationOptional<"pending" | "sent" | "failed">;
  declare attempts: CreationOptional<number>;
  declare lastError: string | null;
  declare sentAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

EmailNotificationLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "orders", key: "id" },
      onDelete: "SET NULL",
    },
    idempotencyKey: { type: DataTypes.STRING(240), allowNull: false, unique: true },
    notificationType: { type: DataTypes.STRING(80), allowNull: false },
    recipient: { type: DataTypes.STRING(254), allowNull: false },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastError: { type: DataTypes.TEXT, allowNull: true },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "email_notification_logs" },
);
