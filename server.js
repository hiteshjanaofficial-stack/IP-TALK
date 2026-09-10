// IP TALK — server.js
// Made by Snehasish Jana
//
// A room is identified by TWO things the user supplies on the join screen:
//   1. Room Number  — a short code the group agrees on
//   2. Room IP      — a text key acting as a second shared secret
// A room's real identity is roomNumber + "::" + roomIp (both normalized).
//
// NOTE ON "IP ADDRESS": browsers cannot open a raw socket to an arbitrary
// IP address a user types in — there is no such capability on the web
// platform, by design (it's how phishing/port-scanning are prevented).
// So "connecting by IP address" here works as a shared passcode that,
// combined with the room number, forms the room's identity on this
// central relay server. Anyone anywhere, on any network, who enters the
// same Room Number + Room IP reaches the same room and can talk in real
// time. This is the same trick apps like Zoom/Discord use under the hood
// (a central relay), not literal peer-to-peer IP dialing.

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// In-memory room store: { [roomKey]: { users: Map<socketId,{username}>, history: [] } }
const rooms = new Map();

const MAX_HISTORY = 200;

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function roomKeyOf(roomNumber, roomIp) {
  return `${normalize(roomNumber)}::${normalize(roomIp)}`;
}

function getRoom(roomKey) {
  if (!rooms.has(roomKey)) {
    rooms.set(roomKey, { users: new Map(), history: [] });
  }
  return rooms.get(roomKey);
}

function userList(room) {
  return Array.from(room.users.values()).map((u) => u.username);
}

function pushHistory(room, entry) {
  room.history.push(entry);
  if (room.history.length > MAX_HISTORY) room.history.shift();
}

io.on('connection', (socket) => {
  socket.data.roomKey = null;
  socket.data.username = null;

  socket.on('join_room', ({ roomNumber, roomIp, username }, ack) => {
    try {
      roomNumber = String(roomNumber || '').trim();
      roomIp = String(roomIp || '').trim();
      username = String(username || '').trim();

      if (!roomNumber || !roomIp || !username) {
        return ack && ack({ ok: false, error: 'Room number, room IP, and username are all required.' });
      }
      if (username.length > 24) {
        return ack && ack({ ok: false, error: 'Username must be 24 characters or fewer.' });
      }

      const roomKey = roomKeyOf(roomNumber, roomIp);
      const room = getRoom(roomKey);

      const nameTaken = Array.from(room.users.values()).some(
        (u) => normalize(u.username) === normalize(username)
      );
      if (nameTaken) {
        return ack && ack({ ok: false, error: 'That username is already taken in this room.' });
      }

      socket.join(roomKey);
      socket.data.roomKey = roomKey;
      socket.data.username = username;
      socket.data.roomNumber = roomNumber;
      socket.data.roomIp = roomIp;

      room.users.set(socket.id, { username });

      const joinEntry = {
        type: 'system',
        text: `${username} joined the room.`,
        ts: Date.now()
      };
      pushHistory(room, joinEntry);

      ack && ack({
        ok: true,
        roomNumber,
        roomIp,
        history: room.history,
        users: userList(room)
      });

      socket.to(roomKey).emit('system_message', joinEntry);
      io.to(roomKey).emit('user_list', userList(room));
    } catch (err) {
      ack && ack({ ok: false, error: 'Unexpected server error. Please try again.' });
    }
  });

  socket.on('chat_message', (text) => {
    const roomKey = socket.data.roomKey;
    if (!roomKey) return;
    const room = rooms.get(roomKey);
    if (!room) return;

    text = String(text || '').trim();
    if (!text) return;
    if (text.length > 2000) text = text.slice(0, 2000);

    const entry = {
      type: 'message',
      username: socket.data.username,
      text,
      ts: Date.now()
    };
    pushHistory(room, entry);
    io.to(roomKey).emit('chat_message', entry);
  });

  socket.on('leave_room', () => {
    handleLeave(socket);
  });

  socket.on('disconnect', () => {
    handleLeave(socket);
  });
});

function handleLeave(socket) {
  const roomKey = socket.data.roomKey;
  if (!roomKey) return;
  const room = rooms.get(roomKey);
  if (!room) return;

  const username = socket.data.username;
  room.users.delete(socket.id);
  socket.leave(roomKey);
  socket.data.roomKey = null;

  if (username) {
    const leaveEntry = {
      type: 'system',
      text: `${username} left the room.`,
      ts: Date.now()
    };
    pushHistory(room, leaveEntry);
    io.to(roomKey).emit('system_message', leaveEntry);
    io.to(roomKey).emit('user_list', userList(room));
  }

  if (room.users.size === 0) {
    rooms.delete(roomKey);
  }
}

server.listen(PORT, () => {
  console.log(`IP TALK server running on port ${PORT}`);
});
