import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database.js";

export class Artist extends Model<
  InferAttributes<Artist>,
  InferCreationAttributes<Artist>
> {
  declare id: CreationOptional<string>;
  declare slug: string;
  declare name: string;
  declare location: string;
  declare medium: string;
  declare bio: string;
  declare imageUrl: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Artist.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    location: { type: DataTypes.STRING(120), allowNull: false },
    medium: { type: DataTypes.STRING(200), allowNull: false },
    bio: { type: DataTypes.TEXT, allowNull: false },
    imageUrl: { type: DataTypes.TEXT, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "artists" },
);
