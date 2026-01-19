export class CartManager {
    constructor() {
        this.carts = new Map();
    }

    addItem(userId, item, price) {
        if (!this.carts.has(userId)) this.carts.set(userId, []);
        const cart = this.carts.get(userId);
        const existing = cart.find(i => i.name === item);
        if (existing) existing.quantity++;
        else cart.push({ name: item, price, quantity: 1 });
    }

    removeItem(userId, item) {
        if (!this.carts.has(userId)) return;
        const cart = this.carts.get(userId).filter(i => i.name !== item);
        this.carts.set(userId, cart);
    }

    updateQuantity(userId, item, quantity) {
        if (!this.carts.has(userId)) return;
        const cart = this.carts.get(userId);
        const existing = cart.find(i => i.name === item);
        if (existing) existing.quantity = Math.min(Math.max(quantity, 1), 99);
    }

    getCart(userId) {
        return this.carts.get(userId) || [];
    }

    getTotal(userId) {
        return this.getCart(userId).reduce((acc, i) => acc + i.price * i.quantity, 0);
    }
  }
