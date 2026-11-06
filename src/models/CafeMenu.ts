import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database.js";

export class CafeMenu extends Model<
  InferAttributes<CafeMenu>,
  InferCreationAttributes<CafeMenu>
> {
  declare id: string;
  declare pdfUrl: string;
  declare publicId: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CafeMenu.init(
  {
    id: { type: DataTypes.STRING(20), primaryKey: true },
    pdfUrl: { type: DataTypes.TEXT, allowNull: false },
    publicId: { type: DataTypes.STRING(255), allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "cafe_menu" },
);
