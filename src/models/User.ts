import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database.js";

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare email: string;
  declare phone: string | null;
  declare passwordHash: string;
  declare role: CreationOptional<"user" | "admin">;
  declare tokenVersion: CreationOptional<number>;
  declare resetTokenHash: string | null;
  declare resetTokenExpiresAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(160), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
    phone: { type: DataTypes.STRING(40), allowNull: true },
    passwordHash: { type: DataTypes.STRING(100), allowNull: false },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      allowNull: false,
      defaultValue: "user",
    },
    tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    resetTokenHash: { type: DataTypes.STRING(64), allowNull: true },
    resetTokenExpiresAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "users" },
);
