const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize, Message } = require('./models');
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

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            // For debugging/development, we might want to allow this but let's be explicit
            console.log("Blocking CORS origin:", origin);
            // FAIL SAFE: If it matches vercel app just in case of trailing slash or protocol mismatch
            if (origin.includes('linkup-silk.vercel.app')) return callback(null, true);

            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
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
        console.log('Database synced.');



        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

startServer();
