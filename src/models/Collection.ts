import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database.js";

export class Collection extends Model<
  InferAttributes<Collection>,
  InferCreationAttributes<Collection>
> {
  declare id: CreationOptional<string>;
  declare slug: string;
  declare title: string;
  declare line: string;
  declare description: string;
  declare imageUrl: string;
  declare productSlugs: string[];
  declare displayOrder: CreationOptional<number>;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Collection.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    line: { type: DataTypes.STRING(240), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    imageUrl: { type: DataTypes.TEXT, allowNull: false },
    productSlugs: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "collections" },
);
