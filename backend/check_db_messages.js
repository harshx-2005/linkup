const { Message } = require('./src/models');
const { sequelize } = require('./src/models');

async function checkMessages() {
    try {
        await sequelize.authenticate();
        console.log("DB Connected.");

        // Check messages for conversation 30007 (checking last 10)
        const messages = await Message.findAll({
            where: { conversationId: 30007 },
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        console.log("--- Last 10 Messages ---");
        messages.forEach(m => {
            console.log(`[${m.id}] Type: ${m.messageType} | Content: ${m.content} | Url: ${m.attachmentUrl ? m.attachmentUrl.substring(0, 50) + '...' : 'null'}`);
        });

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
}

checkMessages();
