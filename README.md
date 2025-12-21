
# 📘 Real-Time Messaging Platform – Development Documentation  
### React + Tailwind + Node.js + Express + Sequelize + MySQL + Socket.io + Cloudinary

## 📌 Overview
A modern, production-style real-time messaging application inspired by WhatsApp, Discord, and Telegram.  
Supports private chats, group chats, file uploads, typing indicators, message statuses, and more.

This documentation is strictly for development setup, architecture, schema, and feature specifications.

## 🏗️ System Architecture
```
Frontend (React + Vite + Tailwind)
     |
     | Axios HTTP + Socket.io-client
     v
Backend (Express + Sequelize + Socket.io)
     |
     | Sequelize ORM
     v
MySQL Database
```

## ⚙️ Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Axios
- Socket.io-client
- Context API / Redux Toolkit

### Backend
- Node.js  
- Express.js  no view
- Sequelize ORM (MySQL)  
- Socket.io  
- bcrypt  
- JWT  
- Cloudinary  

### Database
- MySQL  
- Sequelize migrations + models

## 📂 Folder Structure

### Frontend
```
/src
  /components
  /layouts
  /pages
  /context
  /services (axios)
  /socket
  /utils
  App.jsx
  main.jsx
```

### Backend
```
/src
  /config        
  /models        
  /controllers
  /routes
  /middlewares
  /services
  /utils
  server.js
```

## 🛠️ Development Setup

### Frontend
```
cd frontend
npm install
npm run dev
```

### Backend
```
cd backend
npm install
npm run dev
```

## 🔐 Environment Variables

### Backend `.env`
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=harshx2005
DB_NAME=chatapp
DB_PORT=3306
JWT_SECRET=yourSecretkey
CLOUDINARY_CLOUD=xxx
CLOUDINARY_KEY=xxx
CLOUDINARY_SECRET=xxx
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000/api
```

## 🗄️ Database Schema (Sequelize)

### Users
- id  
- name  
- email  
- password  
- avatar  
- role  
- status  
- bio  

### Conversations
- id  
- isGroup  
- groupName  
- groupImage  
- createdBy  

### ConversationMembers
- id  
- conversationId  
- userId  

### Messages
- id  
- senderId  
- conversationId  
- content  
- messageType  
- attachmentUrl  
- seenBy (JSON)  
- timestamps  

### UserSettings
- userId  
- theme  
- notifications  

## 🔌 API Modules

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Users
- GET /api/users
- PUT /api/users/profile
- PATCH /api/users/settings

### Conversations
- POST /api/conversations/private
- POST /api/conversations/group
- GET /api/conversations

### Messages
- POST /api/messages/send
- GET /api/messages/:conversationId
- PATCH /api/messages/edit/:id
- DELETE /api/messages/:id

## ⚡ Socket.io Event Flow

### Client → Server
- send_message
- typing
- stop_typing
- join_room
- leave_room

### Server → Client
- receive_message
- message_seen
- message_delivered
- user_typing
- user_online
- user_offline

## 🌟 Feature Specifications

### Real-Time Private Chat
- Live messaging  
- Seen / Delivered  
- Typing indicator  
- Edit message  
- Delete message  
- Search messages  
- Infinite scrolling  
- File uploads  
- Online/offline status  

### Group Chat System
- Create group  
- Add/remove members  
- Group icon  
- Mentions @username  
- Group logs  
- Real-time updates  
- Group admin controls  

### File Uploads (Cloudinary)
- Image  
- PDF  
- Video  
- Audio  

### Notifications
- New message  
- Mentions  
- Group events  

### Admin Tools
- Manage users  
- Moderate messages  
- View conversations  
- Analytics (optional)  

## 🎨 Frontend UI Requirements
- Sidebar chat list  
- Chat panel  
- Message bubble UI  
- Typing indicator  
- Profile drawer  
- Settings page  
- Search bar  
- Mobile responsive layout  
- Dark/light mode  

## 🧪 Testing Guidelines
- Postman for API testing  
- Jest / React Testing Library  
- Sequelize test DB optional  

## 🛑 Note
This documentation covers only development.  
No deployment or production configuration is included.

