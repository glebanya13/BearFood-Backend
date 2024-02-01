const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
    firstName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    formattedAddress: {
        type: DataTypes.STRING,
    },
    address: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
    accountId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Account',
            key: 'id',
        },
    },
    cart: {
        type: DataTypes.JSONB,
        defaultValue: { items: [] },
    },
}, {
    timestamps: true,
});

User.prototype.addToCart = async function (item) {
    const cartItemIndex = this.cart.items.findIndex(cp => cp.itemId === item.id);
    let newQuantity = 1;
    const updatedCartItems = [...this.cart.items];

    if (cartItemIndex >= 0) {
        newQuantity = this.cart.items[cartItemIndex].quantity + 1;
        updatedCartItems[cartItemIndex].quantity = newQuantity;
    } else {
        updatedCartItems.push({
            itemId: item.id,
            quantity: newQuantity,
        });
    }

    const updatedCart = {
        items: updatedCartItems,
    };

    this.cart = updatedCart;
    await this.save();
};

User.prototype.reduceQuantity = async function (itemId) {
    const newCart = this.cart.items.map(item => {
        if (item.itemId === itemId) {
            return {
                ...item,
                quantity: item.quantity - 1,
            };
        }
        return item;
    });

    const finalNewCart = newCart.filter(item => item.quantity > 0);
    this.cart.items = finalNewCart;
    await this.save();
};

User.prototype.removeFromCart = async function (itemId) {
    const updatedCartItems = this.cart.items.filter(item => item.itemId !== itemId);
    this.cart.items = updatedCartItems;
    await this.save();
};

User.prototype.clearCart = async function () {
    this.cart = { items: [] };
    await this.save();
};

module.exports = User;