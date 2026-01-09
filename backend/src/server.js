const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const userRoutes = require('./routes/userRoutes');
const blockRoutes = require('./routes/blockRoutes');
const { initializeSocket } = require('./socket');

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = [process.env.FRONTEND_URL, 'https://linkup-silk.vercel.app', 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean);
console.log('Allowed Origins:', allowedOrigins);
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1 && !process.env.FRONTEND_URL) {
            // If FRONTEND_URL not set, allow all (dev mode fallback)
            return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            return callback(null, true);
        } else {
            // Optional: Fail safe to allow for now during testing
            return callback(null, true);
        }
    },
    credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/uploads', express.static('uploads'));

const io = initializeSocket(server);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        // Sync models (Enable alter to update schema)
        await sequelize.sync({ alter: true });
        console.log('Database synced.');

        // Sync models (Enable alter to update schema)
        await sequelize.sync({ alter: true });
        console.log('Database synced.');

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

startServer();
