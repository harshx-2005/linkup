const { sequelize, User } = require('./models');
const bcrypt = require('bcrypt');

async function createAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Check if admin exists
        const existingAdmin = await User.findOne({ where: { email: 'admin@example.com' } });

        if (existingAdmin) {
            console.log('Admin already exists: admin@example.com');
            // Ensure role is admin
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                await existingAdmin.save();
                console.log('Updated existing user role to admin.');
            }
        } else {
            const hashedPassword = await bcrypt.hash('password123', 10);
            await User.create({
                name: 'System Admin',
                email: 'admin@example.com',
                password: hashedPassword,
                role: 'admin',
                bio: 'System Administrator',
                status: 'online'
            });
            console.log('Admin created successfully.');
        }

        console.log('Credentials:');
        console.log('Email: admin@example.com');
        console.log('Password: password123');

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await sequelize.close();
    }
}

createAdmin();
