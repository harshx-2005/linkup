const { Message } = require('./src/models');
const { sequelize } = require('./src/models');

async function check() {
    try {
        await sequelize.authenticate();
        const msgs = await Message.findAll({
            limit: 3,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'attachmentUrl']
        });
        console.log("--- URLs ---");
        msgs.forEach(m => console.log(`[${m.id}] ${m.attachmentUrl}`));
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
check();
