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

  const productColumns = await queryInterface.describeTable("products");
  if (!productColumns.kind) {
    await queryInterface.addColumn("products", "kind", {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "physical",
    });
  }

  const extendedOrderColumns = await queryInterface.describeTable("orders");
  if (!extendedOrderColumns.subtotal) {
    await queryInterface.addColumn("orders", "subtotal", {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
  }
  if (!extendedOrderColumns.shippingCost) {
    await queryInterface.addColumn("orders", "shippingCost", {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
  }
  if (!extendedOrderColumns.checkoutKey) {
    await queryInterface.addColumn("orders", "checkoutKey", {
      type: DataTypes.STRING(160),
      allowNull: true,
      unique: true,
    });
  }
  if (extendedOrderColumns.shippingAddress?.allowNull === false) {
    await queryInterface.changeColumn("orders", "shippingAddress", {
      type: DataTypes.JSONB,
      allowNull: true,
    });
  }
  for (const [column, definition] of [
    ["trackingNumber", { type: DataTypes.STRING(120), allowNull: true }],
    ["trackingUrl", { type: DataTypes.TEXT, allowNull: true }],
    ["shippedAt", { type: DataTypes.DATE, allowNull: true }],
    ["shippingNotes", { type: DataTypes.TEXT, allowNull: true }],
  ] as const) {
    if (!extendedOrderColumns[column]) {
      await queryInterface.addColumn("orders", column, definition);
    }
  }

  const orderItemColumns = await queryInterface.describeTable("order_items");
  if (!orderItemColumns.productKind) {
    await queryInterface.addColumn("order_items", "productKind", {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "physical",
    });
  }
  if (!orderItemColumns.digitalDeliveryStatus) {
    await queryInterface.addColumn("order_items", "digitalDeliveryStatus", {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    });
  }
  if (!orderItemColumns.digitalDeliveryUrl) {
    await queryInterface.addColumn("order_items", "digitalDeliveryUrl", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
}

export async function makeArtistImageUrlNullable(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const artistColumns = await queryInterface.describeTable("artists");
  if (artistColumns.imageUrl?.allowNull === false) {
    await queryInterface.changeColumn("artists", "imageUrl", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
}

export async function addProductImages(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const productColumns = await queryInterface.describeTable("products");
  if (!productColumns.images) {
    await queryInterface.addColumn("products", "images", {
      type: DataTypes.JSONB,
      allowNull: true,
    });
  }
}

export async function addProductSize(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const productColumns = await queryInterface.describeTable("products");
  if (!productColumns.size) {
    await queryInterface.addColumn("products", "size", {
      type: DataTypes.STRING(120),
      allowNull: true,
    });
  }

  const orderItemColumns = await queryInterface.describeTable("order_items");
  if (!orderItemColumns.size) {
    await queryInterface.addColumn("order_items", "size", {
      type: DataTypes.STRING(120),
      allowNull: true,
    });
  }
}
