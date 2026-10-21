import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database.js";

export class ContactMessage extends Model<
  InferAttributes<ContactMessage>,
  InferCreationAttributes<ContactMessage>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare email: string;
  declare subject: string | null;
  declare message: string;
  declare status: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ContactMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(160), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false },
    subject: { type: DataTypes.STRING(200), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "new",
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "contact_messages" },
);
