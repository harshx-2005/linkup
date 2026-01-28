const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    isGroup: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    groupName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    groupImage: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastSeen: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    disappearingEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    disappearingDuration: {
        type: DataTypes.INTEGER, // in minutes, default 24 hours (1440)
        defaultValue: 1440,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true, // Null for private chats
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted'),
        defaultValue: 'accepted',
    },
}, {
    timestamps: true,
});

module.exports = Conversation;
