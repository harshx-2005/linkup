const { Server } = require('socket.io');
const { User, Message } = require('../models');

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [process.env.FRONTEND_URL, "https://linkup-silk.vercel.app", "http://localhost:5173"],
            methods: ["GET", "POST"]
        }
    });

    // Track online users: userId -> socketId
    const onlineUsers = new Map();

    // Track active group calls: conversationId -> initiatorId
    const activeGroupCalls = new Map();

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('join_room', (userId) => {
            const room = String(userId);
            socket.join(room); // Join personal room
            onlineUsers.set(String(userId), socket.id);
            io.emit('user_online', String(userId)); // Broadcast to all
            console.log(`User ${room} joined room ${room}`);
        });

        // Join conversation room
        socket.on('join_conversation', (conversationId) => {
            const room = String(conversationId);
            socket.join(room);
            console.log(`Socket ${socket.id} joined conversation room: ${room}`);

            // Check if there is an active group call in this conversation
            const activeCallData = activeGroupCalls.get(conversationId);

            if (activeCallData) {
                // ZOMBIE CHECK: Verify if the call room actually has users
                // logic: If activeGroupCalls says yes, but room "call_{id}" is empty -> Zombie
                const callRoomStart = activeCallData.startTime;
                // Allow a grace window of 10 seconds for initial join
                if (Date.now() - callRoomStart > 10000) {
                    const callRoomName = `call_${conversationId}`;
                    const usersInCall = io.sockets.adapter.rooms.get(callRoomName);

                    if (!usersInCall || usersInCall.size === 0) {
                        console.log(`Detected ZOMBIE call in ${conversationId}. Cleaning up.`);
                        activeGroupCalls.delete(conversationId);
                        // Do NOT emit start. Emit end just in case anyone else has it stuck.
                        io.to(room).emit('group_call_ended', { conversationId });
                        return;
                    }
                }

                // If valid, emit event to this SPECIFIC socket
                socket.emit('group_call_started', {
                    conversationId,
                    initiatorId: activeCallData.initiatorId,
                    fromSocketId: activeCallData.socketId,
                    startTime: activeCallData.startTime
                });
                console.log(`Notifying reconnected user ${socket.id} of active call in ${conversationId}`);
            }
        });

        socket.on('send_message', (data) => {
            if (data.conversationId) {
                const room = String(data.conversationId);
                // Broadcast to everyone in the room EXCEPT the sender (if desired, but usually to all is fine if client handles dedup)
                // Actually, client manually updates own state. But simpler to emit to room. 
                // However, current client logic might duplicate if it does optimistic + receive.
                // Let's look at Chat.jsx: 
                // handleReceiveMessage checks: if (exists) return prev;
                // So duplicate emission is handled.
                io.to(room).emit('receive_message', data);
                console.log(`Message sent to room ${room}`);
            }
        });

        socket.on('typing', (data) => {
            socket.to(String(data.conversationId)).emit('user_typing', data);
        });

        socket.on('stop_typing', (data) => {
            socket.to(String(data.conversationId)).emit('user_stop_typing', data);
        });

        socket.on('mark_seen', (data) => {
            const room = String(data.conversationId);
            console.log(`Server received mark_seen for room ${room} from user ${data.userId}`);
            io.to(room).emit('messages_seen', data);
        });

        socket.on('mark_delivered', (data) => {
            const room = String(data.conversationId);
            // console.log(`Server received mark_delivered for room ${room} from user ${data.userId}`);
            io.to(room).emit('messages_delivered', data);
        });

        socket.on('edit_message', (data) => {
            io.to(String(data.conversationId)).emit('message_edited', data);
        });

        socket.on('delete_message', (data) => {
            io.to(String(data.conversationId)).emit('message_deleted', data);
        });

        socket.on('new_conversation', (data) => {
            // data: { conversation: formattedConv, toUserId: userId (if private), memberIds: [] (if group) }
            if (data.toUserId) {
                // Private chat
                io.to(String(data.toUserId)).emit('new_conversation', data.conversation);
            } else if (data.memberIds && Array.isArray(data.memberIds)) {
                // Group chat - emit to all members
                data.memberIds.forEach(memberId => {
                    io.to(String(memberId)).emit('new_conversation', data.conversation);
                });
            }
        });

        // --- WebRTC Signaling ---
        // --- WebRTC Signaling ---
        socket.on('call_user', (data) => {
            // data: { toUserId, offer, isVideo, callerName }
            console.log(`Call offer from ${socket.id} to user ${data.toUserId}`);
            io.to(String(data.toUserId)).emit('call_incoming', {
                offer: data.offer,
                from: socket.id,
                fromUserId: String(Array.from(onlineUsers.entries()).find(([uid, sid]) => sid === socket.id)?.[0] || 'Unknown'),
                callerName: data.callerName,
                isVideo: data.isVideo
            });
        });

        socket.on('answer_call', (data) => {
            // data: { to, answer } (to is socketId or userId)
            console.log(`Call answered by ${socket.id} to ${data.to}`);
            io.to(data.to).emit('call_accepted', data.answer);
        });

        socket.on('ice_candidate', (data) => {
            // data: { to, candidate }
            io.to(data.to).emit('ice_candidate', data.candidate);
        });

        socket.on('reject_call', (data) => {
            // data: { to }
            io.to(data.to).emit('call_rejected');
        });

        socket.on('end_call', (data) => {
            // data: { to }
            io.to(String(data.to)).emit('call_ended');
        });

        // --- Call Switching (Voice <-> Video) ---
        socket.on('call_switch_request', (data) => {
            // data: { toUserId }
            io.to(String(data.toUserId)).emit('call_switch_request', {
                from: socket.id,
                fromUserId: String(Array.from(onlineUsers.entries()).find(([uid, sid]) => sid === socket.id)?.[0] || 'Unknown')
            });
        });

        socket.on('call_switch_response', (data) => {
            // data: { toUserId, accepted }
            io.to(String(data.toUserId)).emit('call_switch_response', {
                accepted: data.accepted,
                from: socket.id
            });
        });

        // --- Group Call Signaling (Mesh) ---
        socket.on('join_group_call', (data) => {
            let conversationId, userId;
            if (typeof data === 'object') {
                conversationId = data.conversationId;
                userId = data.userId;
            } else {
                conversationId = data;
                // Fallback to lookup (less reliable if user just reconnected)
                const entry = Array.from(onlineUsers.entries()).find(([u, s]) => s === socket.id);
                userId = entry ? entry[0] : null;
            }

            const room = `call_${conversationId}`;
            const usersInRoom = io.sockets.adapter.rooms.get(room) || new Set();

            // If room is empty, this user is starting the call
            if (usersInRoom.size === 0) {
                // Track initiator
                if (!userId) {
                    console.error("Warning: starting group call without valid userId. Log generation may fail.");
                }
                activeGroupCalls.set(String(conversationId), { initiatorId: userId, socketId: socket.id, startTime: Date.now() });

                // Broadcast to the CONVERSATION room (including sender if needed, but sender is joining)
                io.to(String(conversationId)).emit('group_call_started', {
                    conversationId,
                    initiatorId: userId,
                    fromSocketId: socket.id,
                    startTime: Date.now()
                });
                console.log(`Group call started in conversation ${conversationId} by ${userId}`);
            }

            // Convert Set to Array and Map to User info
            const otherUsers = [...usersInRoom]
                .filter(id => id !== socket.id)
                .map(socketId => {
                    // Find userId for this socketId
                    const entry = Array.from(onlineUsers.entries()).find(([u, s]) => s === socketId);
                    return { socketId, userId: entry ? entry[0] : null };
                });

            socket.join(room);
            console.log(`User ${socket.id} joined group call ${room}`);

            // Send list of existing users to the new user so they can initiate offers
            socket.emit('all_users_in_call', otherUsers);
        });

        socket.on('sending_signal', (payload) => {
            // payload: { userToSignal, signal, callerID, callerUserID }
            io.to(payload.userToSignal).emit('user_joined_call', {
                signal: payload.signal,
                callerID: payload.callerID, // Socket ID
                callerUserID: payload.callerUserID // User ID
            });
        });

        socket.on('returning_signal', (payload) => {
            // payload: { signal, callerID }
            io.to(payload.callerID).emit('receiving_returned_signal', {
                signal: payload.signal,
                id: socket.id
            });
        });

        // Helper to log call duration
        const logGroupCall = async (conversationId, callData, endReason) => {
            const durationMs = Date.now() - (callData.startTime || Date.now());
            if (durationMs < 100) return; // Ignore extremely short clicks, but allow quick tests

            const seconds = Math.floor(durationMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            const durationText = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;

            try {
                // Ensure we have a valid senderId (fallback to 1 if missing, to prevent crash)
                // In production, we should ensure logic guarantees initiatorId.
                const safeSenderId = callData.initiatorId || (onlineUsers.get(callData.socketId)) || 1;

                const message = await Message.create({
                    conversationId: conversationId, // Fix: camelCase to match Model
                    senderId: safeSenderId,
                    content: JSON.stringify({
                        type: 'call_log',
                        status: 'ended',
                        duration: durationText,
                        reason: endReason
                    }),
                    messageType: 'system'
                });

                // Emit new message
                // Emit new message using the event name the frontend expects
                io.to(String(conversationId)).emit('receive_message', message);
            } catch (err) {
                console.error('Failed to log group call:', err);
            }
        };

        socket.on('leave_group_call', (conversationId) => {
            const room = `call_${conversationId}`;
            socket.leave(room);
            // Notify others
            socket.to(room).emit('user_left_call', socket.id);

            // Check if room is empty to clear active call
            const usersInRoom = io.sockets.adapter.rooms.get(room);
            if (!usersInRoom || usersInRoom.size === 0) {
                // GRACE PERIOD: Wait 4s to handle StrictMode bounce or Refresh
                setTimeout(() => {
                    const currentRoom = io.sockets.adapter.rooms.get(room);
                    if ((!currentRoom || currentRoom.size === 0) && activeGroupCalls.has(String(conversationId))) {
                        const callData = activeGroupCalls.get(String(conversationId));
                        activeGroupCalls.delete(String(conversationId));

                        io.to(String(conversationId)).emit('group_call_ended', { conversationId });
                        if (callData) logGroupCall(conversationId, callData, 'last_user_left');
                        console.log(`Group call in ${conversationId} ended (grace period expired).`);
                    }
                }, 4000);
            }
        });

        socket.on('end_group_call', (conversationId) => {
            // Initiator explicitly ending the call for everyone
            const activeCall = activeGroupCalls.get(String(conversationId));

            // Verify if requester is the initiator (optional, but good security)
            // For now, we trust the client logic or just allow active participant to end?
            // User requirement: "user 2 (caller) cuts then it end all".

            activeGroupCalls.delete(String(conversationId));
            io.to(String(conversationId)).emit('group_call_ended', { conversationId });

            if (activeCall) {
                logGroupCall(conversationId, activeCall, 'host_ended');
            }
            console.log(`Group call in ${conversationId} forcefully ended by initiator.`);
        });

        socket.on('disconnecting', () => {
            // Check if user is leaving a call room and if that would make it empty
            for (const room of socket.rooms) {
                if (room.startsWith('call_')) {
                    const conversationId = room.split('_')[1];
                    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;

                    // If size is 1 (just this user) or 0, it will be empty after disconnect
                    if (roomSize <= 1) {
                        // GRACE PERIOD for Disconnects/Refresh
                        setTimeout(() => {
                            const currentRoom = io.sockets.adapter.rooms.get(room);
                            // Force string key
                            if (activeGroupCalls.has(String(conversationId))) {
                                // Check real-time room size again
                                const updatedRoom = io.sockets.adapter.rooms.get(room);
                                if (!updatedRoom || updatedRoom.size === 0) {
                                    const callData = activeGroupCalls.get(String(conversationId));
                                    activeGroupCalls.delete(String(conversationId));

                                    io.to(String(conversationId)).emit('group_call_ended', { conversationId });
                                    if (callData) logGroupCall(conversationId, callData, 'last_user_disconnected');
                                    console.log(`Group call in ${conversationId} ended (last user disconnected after grace period).`);
                                }
                            }
                        }, 4000);
                    }
                }
            }
        });

        socket.on('disconnect', async () => {
            console.log('User disconnected:', socket.id);

            // 1. Cleanup Online Status
            // Find userId from socketId
            for (const [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    onlineUsers.delete(userId);
                    try {
                        const now = new Date();
                        await User.update({ lastSeen: now, status: 'offline' }, { where: { id: userId } });
                        io.emit('user_offline', { userId, lastSeen: now });
                    } catch (err) {
                        console.error('Error updating lastSeen:', err);
                    }
                    break;
                }
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initializeSocket, getIO };

