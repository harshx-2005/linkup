const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Block = sequelize.define('Block', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    blockerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        },
    },
    blockedId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        },
    },
}, {
    timestamps: true,
});

module.exports = Block;
