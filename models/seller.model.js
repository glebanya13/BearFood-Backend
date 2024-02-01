const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Seller = sequelize.define('Seller', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    tags: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    formattedAddress: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    imageUrl: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
    },
    address: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
    minOrderAmount: {
        type: DataTypes.NUMBER,
    },
    costForOne: {
        type: DataTypes.NUMBER,
    },
    payment: {
        type: DataTypes.ARRAY(DataTypes.STRING),
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
}, {
    timestamps: true,
});

const Item = require('./item.model');

Seller.hasMany(Item, { foreignKey: 'sellerId' }); // Assuming Item model is defined with 'sellerId'

module.exports = Seller;
