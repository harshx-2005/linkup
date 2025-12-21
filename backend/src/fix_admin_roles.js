const { Conversation, ConversationMember, sequelize } = require('./models');

const fixAdminRoles = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Find all group conversations
        const groups = await Conversation.findAll({ where: { isGroup: true } });
        console.log(`Found ${groups.length} groups.`);

        for (const group of groups) {
            if (!group.createdBy) continue;

            // 2. Find membership for creator
            const member = await ConversationMember.findOne({
                where: {
                    conversationId: group.id,
                    userId: group.createdBy
                }
            });

            if (member) {
                // 3. Set role to admin
                member.role = 'admin';
                member.isAdmin = true; // Legacy sync
                await member.save();
                console.log(`Updated admin for group ${group.id}`);
            }
        }

        console.log('Done fixing roles.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixAdminRoles();
