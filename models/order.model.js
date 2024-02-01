const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Order = sequelize.define('Order', {
    items: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM(
            'Placed',
            'Cancelled',
            'Accepted',
            'Completed',
            'Out For Delivery'
        ),
        allowNull: false,
    },
    userEmail: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userAddress: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id',
        },
    },
    sellerPhone: {
        type: DataTypes.NUMBER,
        allowNull: false,
    },
    sellerName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    sellerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Seller',
            key: 'id',
        },
    },
}, {
    timestamps: true,
});

const User = require('./user.model');
const Seller = require('./seller.model');

Order.belongsTo(User, { foreignKey: 'userId' });
Order.belongsTo(Seller, { foreignKey: 'sellerId' });

module.exports = Order;
