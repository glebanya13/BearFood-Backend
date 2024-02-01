const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Item = sequelize.define('Item', {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    tags: {
        type: DataTypes.STRING,
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.NUMBER,
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

const Seller = require('./seller.model');
const User = require('./user.model');

Item.belongsTo(Seller, { foreignKey: 'sellerId' });
Item.belongsTo(User, { foreignKey: 'userId' });

module.exports = Item;