import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database.js";

export class CafeGalleryImage extends Model<
  InferAttributes<CafeGalleryImage>,
  InferCreationAttributes<CafeGalleryImage>
> {
  declare id: CreationOptional<string>;
  declare imageUrl: string;
  declare publicId: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CafeGalleryImage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    imageUrl: { type: DataTypes.TEXT, allowNull: false },
    publicId: { type: DataTypes.STRING(255), allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "cafe_gallery_images" },
);
