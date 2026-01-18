const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

async function fixSchema() {
    try {
        console.log('Authenticating...');
        await sequelize.authenticate();
        console.log('Connected to database.');

        console.log('Checking for replyToId column...');

        // Check if column exists
        const [results] = await sequelize.query(
            "SHOW COLUMNS FROM Messages LIKE 'replyToId'",
            { type: QueryTypes.SELECT }
        );

        if (results) {
            console.log('Column replyToId already exists.');
        } else {
            console.log('Column missing. Adding replyToId...');
            await sequelize.query(
                "ALTER TABLE Messages ADD COLUMN replyToId INTEGER DEFAULT NULL"
            );
            console.log('Column replyToId added successfully.');

            // Add Foreign Key constraint (optional but good practice)
            // await sequelize.query(
            //     "ALTER TABLE Messages ADD CONSTRAINT fk_message_reply FOREIGN KEY (replyToId) REFERENCES Messages(id) ON DELETE SET NULL"
            // );
            // console.log('Foreign Key constraint added.');
        }

        console.log('Schema fix completed.');
        process.exit(0);
    } catch (error) {
        console.error('Schema fix failed:', error);
        process.exit(1);
    }
}

fixSchema();
