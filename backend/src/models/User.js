const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    avatar: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user',
    },
    status: {
        type: DataTypes.ENUM('online', 'offline'),
        defaultValue: 'offline',
    },
    bio: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    lastSeen: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    timestamps: true,
});

module.exports = User;
