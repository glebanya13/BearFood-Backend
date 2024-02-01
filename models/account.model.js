const { DataTypes } = require("sequelize")
const sequelize = require("../db")

const Account = sequelize.define("Account", {
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('ROLE_USER', 'ROLE_ADMIN', 'ROLE_SELLER'),
        allowNull: false,
    },
    accountVerifyToken: {
        type: DataTypes.STRING,
    },
    accountVerifyTokenExpiration: {
        type: DataTypes.DATE,
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    timestamps: true,
});

module.exports = Account