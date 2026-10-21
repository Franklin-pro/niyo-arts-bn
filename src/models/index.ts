import { Artist } from "./Artist.js";
import { Collection } from "./Collection.js";
import { ContactMessage } from "./ContactMessage.js";
import { Order } from "./Order.js";
import { OrderItem } from "./OrderItem.js";
import { Product } from "./Product.js";

Artist.hasMany(Product, { foreignKey: "artistId", as: "products" });
Product.belongsTo(Artist, { foreignKey: "artistId", as: "artist" });
Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });

export { Artist, Collection, ContactMessage, Order, OrderItem, Product };
