const { Message } = require('./src/models');
const { sequelize } = require('./src/models');

async function check() {
    try {
        await sequelize.authenticate();
        const msgs = await Message.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'content', 'messageType', 'attachmentUrl', 'conversationId', 'senderId']
        });
        console.log("JSON_OUTPUT_START");
        console.log(JSON.stringify(msgs, null, 2));
        console.log("JSON_OUTPUT_END");
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
check();
