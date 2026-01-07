const { Message } = require('./src/models');
const { sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function checkMessages() {
    try {
        await sequelize.authenticate();
        console.log("DB Connected.");

        // Look for recent messages of type 'image' or containing 'Bot'
        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { messageType: 'image' },
                    { content: { [Op.like]: '%🤖%' } }
                ]
            },
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        console.log("--- FOUND AI MESSAGES ---");
        if (messages.length === 0) console.log("No AI messages found.");

        messages.forEach(m => {
            console.log(`ID: ${m.id} | Type: ${m.messageType} | Content: ${m.content} | URL: ${m.attachmentUrl}`);
        });

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
}

checkMessages();
