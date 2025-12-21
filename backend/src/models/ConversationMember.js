const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConversationMember = sequelize.define('ConversationMember', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    role: {
        type: DataTypes.ENUM('admin', 'member'),
        defaultValue: 'member',
    },
}, {
    timestamps: true,
});

module.exports = ConversationMember;
