const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
        });

        const dbName = process.env.DB_NAME;

        console.log(`Dropping database "${dbName}" if it exists...`);
        await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);

        console.log(`Creating database "${dbName}"...`);
        await connection.query(`CREATE DATABASE \`${dbName}\`;`);

        console.log(`Database "${dbName}" reset successfully.`);
        await connection.end();
    } catch (error) {
        console.error('Error resetting database:', error);
        process.exit(1);
    }
}

resetDatabase();
