import { DataTypes } from "sequelize";
import { sequelize } from "./database.js";

export async function applySchemaUpdates(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const cartColumns = await queryInterface.describeTable("carts");
  if (!cartColumns.userId) {
    await queryInterface.addColumn("carts", "userId", {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    });
  }

  const orderColumns = await queryInterface.describeTable("orders");
  if (!orderColumns.userId) {
    await queryInterface.addColumn("orders", "userId", {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    });
  }

  const userColumns = await queryInterface.describeTable("users");
  if (!userColumns.tokenVersion) {
    await queryInterface.addColumn("users", "tokenVersion", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  }
  if (!userColumns.phone) {
    await queryInterface.addColumn("users", "phone", {
      type: DataTypes.STRING(40),
      allowNull: true,
    });
  }

  const updatedOrderColumns = await queryInterface.describeTable("orders");
  if (!updatedOrderColumns.paymentReference) {
    await queryInterface.addColumn("orders", "paymentReference", {
      type: DataTypes.STRING(80),
      allowNull: true,
    });
  }
  if (!updatedOrderColumns.paymentUrl) {
    await queryInterface.addColumn("orders", "paymentUrl", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
}
