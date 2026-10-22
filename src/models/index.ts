import { Artist } from "./Artist.js";
import { Cart } from "./Cart.js";
import { CartItem } from "./CartItem.js";
import { Collection } from "./Collection.js";
import { ContactMessage } from "./ContactMessage.js";
import { Order } from "./Order.js";
import { OrderItem } from "./OrderItem.js";
import { PaymentAttempt } from "./PaymentAttempt.js";
import { Product } from "./Product.js";
import { User } from "./User.js";

Artist.hasMany(Product, { foreignKey: "artistId", as: "products" });
Product.belongsTo(Artist, { foreignKey: "artistId", as: "artist" });
Cart.hasMany(CartItem, { foreignKey: "cartId", as: "items", onDelete: "CASCADE" });
CartItem.belongsTo(Cart, { foreignKey: "cartId", as: "cart" });
User.hasMany(Cart, { foreignKey: "userId", as: "carts" });
Cart.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(Order, { foreignKey: "userId", as: "orders" });
Order.belongsTo(User, { foreignKey: "userId", as: "user" });
CartItem.belongsTo(Product, {
  foreignKey: "productSlug",
  targetKey: "slug",
  as: "product",
});
Product.hasMany(CartItem, {
  foreignKey: "productSlug",
  sourceKey: "slug",
  as: "cartItems",
});
Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });
Order.hasMany(PaymentAttempt, {
  foreignKey: "orderId",
  as: "paymentAttempts",
  onDelete: "CASCADE",
});
PaymentAttempt.belongsTo(Order, { foreignKey: "orderId", as: "order" });

export {
  Artist,
  Cart,
  CartItem,
  Collection,
  ContactMessage,
  Order,
  OrderItem,
  PaymentAttempt,
  Product,
  User,
};
