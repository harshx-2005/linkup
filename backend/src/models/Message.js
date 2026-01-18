const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    replyToId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true, // Can be null if only attachment
    },
    messageType: {
        type: DataTypes.ENUM('text', 'image', 'video', 'file', 'audio', 'system'),
        defaultValue: 'text',
    },
    attachmentUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    seenBy: {
        type: DataTypes.JSON, // Array of userIds who saw the message
        defaultValue: [],
    },
    deliveredTo: {
        type: DataTypes.JSON, // Array of userIds to whom the message was delivered
        defaultValue: [],
    },
    deletedBy: {
        type: DataTypes.JSON, // Array of userIds who deleted the message for themselves
        defaultValue: [],
    },
    deletedForEveryone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    timestamps: true,
});

module.exports = Message;
