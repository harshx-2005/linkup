const sequelize = require('../config/database');
const User = require('./User');
const Conversation = require('./Conversation');
const ConversationMember = require('./ConversationMember');
const Message = require('./Message');
const Block = require('./Block');

// User - Conversation (Many-to-Many)
User.belongsToMany(Conversation, { through: ConversationMember, foreignKey: 'userId' });
Conversation.belongsToMany(User, { through: ConversationMember, foreignKey: 'conversationId' });

// User - Message (One-to-Many)
User.hasMany(Message, { foreignKey: 'senderId' });
Message.belongsTo(User, { foreignKey: 'senderId' });

// Conversation - Message (One-to-Many)
Conversation.hasMany(Message, { foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

// Conversation - Creator (One-to-Many) - Optional, for group creators
User.hasMany(Conversation, { foreignKey: 'createdBy' });
Conversation.belongsTo(User, { foreignKey: 'createdBy' });

// ConversationMember Associations (Explicit definitions for includes)
ConversationMember.belongsTo(Conversation, { foreignKey: 'conversationId' });
Conversation.hasMany(ConversationMember, { foreignKey: 'conversationId' });
ConversationMember.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(ConversationMember, { foreignKey: 'userId' });

// Block Associations
Block.belongsTo(User, { as: 'Blocker', foreignKey: 'blockerId' });
Block.belongsTo(User, { as: 'Blocked', foreignKey: 'blockedId' });
User.hasMany(Block, { foreignKey: 'blockerId' });

module.exports = {
    sequelize,
    User,
    Conversation,
    ConversationMember,
    Message,
    Block,
};
