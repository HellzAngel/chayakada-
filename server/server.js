const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory room registry
// rooms[roomId] = { type: 'private'|'group', maxMembers: 2|999, members: { socketId: { userName, isHost } } }
const rooms = {};

// Health check endpoint (Render needs this)
app.get('/', (req, res) => {
  res.json({ status: 'Chayakada server is running ☕', rooms: Object.keys(rooms).length });
});

// REST: Check if room exists (used by frontend on join)
app.get('/room/:id', (req, res) => {
  const roomId = req.params.id.toUpperCase();
  if (rooms[roomId]) {
    const room = rooms[roomId];
    const memberCount = Object.keys(room.members).length;
    res.json({
      exists: true,
      type: room.type,
      memberCount,
      isFull: room.type === 'private' && memberCount >= 2
    });
  } else {
    res.json({ exists: false });
  }
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // ── CREATE ROOM ──────────────────────────────────────────────
  socket.on('create-room', ({ roomId, userName, roomType }) => {
    if (rooms[roomId]) {
      socket.emit('error', { message: 'Room already exists.' });
      return;
    }

    rooms[roomId] = {
      type: roomType,
      maxMembers: roomType === 'private' ? 2 : 999,
      members: {
        [socket.id]: { userName, isHost: true }
      }
    };

    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;

    socket.emit('room-created', { roomId });
    io.to(roomId).emit('room-update', buildRoomState(roomId));

    console.log(`Room ${roomId} created by ${userName}`);
  });

  // ── JOIN ROOM ─────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, userName }) => {
    const room = rooms[roomId];

    if (!room) {
      socket.emit('error', { message: 'Room not found! The host may have left.' });
      return;
    }

    const memberCount = Object.keys(room.members).length;
    if (room.type === 'private' && memberCount >= 2) {
      socket.emit('error', { message: 'This private room is full (2/2). Ask the host to create a new room!' });
      return;
    }

    room.members[socket.id] = { userName, isHost: false };
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;

    // Send success event with full state to the newcomer
    const state = buildRoomState(roomId);
    socket.emit('join-success', state);
    
    // Notify all members (including newcomer) of the update
    io.to(roomId).emit('room-update', state);
    
    // WebRTC: Notify others to call this new user
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userName });

    io.to(roomId).emit('system-message', {
      text: `${userName} joined the chayakada! ☕`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    console.log(`${userName} joined room ${roomId}`);
  });

  // ── SEND MESSAGE ──────────────────────────────────────────────
    socket.on('send-message', ({ roomId, text }) => {
    const room = rooms[roomId];
    if (!room || !room.members[socket.id]) return;

    const message = {
      id: Date.now(),
      text,
      sender: socket.id,
      senderName: socket.userName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    io.to(roomId).emit('new-message', message);
  });

  socket.on('refresh-webrtc', ({ roomId }) => {
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userName: socket.userName });
  });

  socket.on('toggle-mute', ({ roomId, isMuted }) => {
    socket.to(roomId).emit('mute-status-update', { socketId: socket.id, isMuted });
  });

  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('user-typing', { userName: socket.userName, socketId: socket.id });
  });

  socket.on('stop-typing', ({ roomId }) => {
    socket.to(roomId).emit('user-stop-typing', { socketId: socket.id });
  });

  // ── DISCONNECT ────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;

    const room = rooms[roomId];
    const leavingUser = room.members[socket.id];
    delete room.members[socket.id];

    const remaining = Object.keys(room.members).length;

    if (remaining === 0) {
      // No one left — destroy room
      delete rooms[roomId];
      console.log(`Room ${roomId} destroyed (empty)`);
    } else {
      // If host left, assign new host
      if (leavingUser?.isHost) {
        const newHostId = Object.keys(room.members)[0];
        room.members[newHostId].isHost = true;
      }

      io.to(roomId).emit('room-update', buildRoomState(roomId));
      io.to(roomId).emit('system-message', {
        text: `${leavingUser?.userName || 'Someone'} left the chayakada.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    console.log(`Socket ${socket.id} (${leavingUser?.userName}) left room ${roomId}`);
  });
});

// Helper: build room state for clients
function buildRoomState(roomId) {
  const room = rooms[roomId];
  if (!room) return null;
  return {
    roomId,
    type: room.type,
    members: Object.entries(room.members).map(([id, data]) => ({
      socketId: id,
      userName: data.userName,
      isHost: data.isHost
    }))
  };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chayakada server running on port ${PORT} ☕`);
});
