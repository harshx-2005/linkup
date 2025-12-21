const { sequelize, User } = require('./models');
const bcrypt = require('bcrypt');

async function seedData() {
    try {
        await sequelize.authenticate();
        console.log('Database connected for seeding.');

        // Sync models to ensure tables exist
        await sequelize.sync({ force: true }); // force: true will drop tables if they exist, which matches our reset plan
        console.log('Database synced (tables created).');

        const hashedPassword = await bcrypt.hash('password123', 10);

        // Create Admin
        await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'admin',
            status: 'online',
            avatar: '',
            bio: 'System Administrator',
        });
        console.log('Admin user created: admin@example.com / password123');

        // Create User
        await User.create({
            name: 'Regular User',
            email: 'user@example.com',
            password: hashedPassword,
            role: 'user',
            status: 'offline',
            avatar: '',
            bio: 'Just a regular user',
        });
        console.log('Regular user created: user@example.com / password123');

        await sequelize.close();
        console.log('Seeding completed.');
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
