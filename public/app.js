// IP TALK — app.js
// Made by Snehasish Jana

const socket = io();

const el = {
  viewLanding: document.getElementById('view-landing'),
  viewRoom: document.getElementById('view-room'),
  joinForm: document.getElementById('join-form'),
  joinBtn: document.getElementById('join-btn'),
  formError: document.getElementById('form-error'),
  roomNumber: document.getElementById('roomNumber'),
  roomIp: document.getElementById('roomIp'),
  username: document.getElementById('username'),
  connStatus: document.getElementById('conn-status'),
  roomTag: document.getElementById('room-tag'),
  userList: document.getElementById('user-list'),
  messageList: document.getElementById('message-list'),
  messageForm: document.getElementById('message-form'),
  messageInput: document.getElementById('message-input'),
  leaveBtn: document.getElementById('leave-btn'),
};

let myUsername = null;

socket.on('connect', () => {
  el.connStatus.textContent = 'server online';
  el.connStatus.classList.add('live');
});
socket.on('disconnect', () => {
  el.connStatus.textContent = 'reconnecting…';
  el.connStatus.classList.remove('live');
});

el.joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  el.formError.textContent = '';
  el.joinBtn.disabled = true;
  el.joinBtn.textContent = 'Joining…';

  const roomNumber = el.roomNumber.value.trim();
  const roomIp = el.roomIp.value.trim();
  const username = el.username.value.trim();

  socket.emit('join_room', { roomNumber, roomIp, username }, (res) => {
    el.joinBtn.disabled = false;
    el.joinBtn.textContent = 'Join room';

    if (!res || !res.ok) {
      el.formError.textContent = (res && res.error) || 'Could not join that room.';
      return;
    }

    myUsername = username;
    enterRoom(res);
  });
});

function enterRoom({ roomNumber, roomIp, history, users }) {
  el.viewLanding.hidden = true;
  el.viewRoom.hidden = false;
  el.roomTag.textContent = `Room ${roomNumber} · ${roomIp}`;

  el.messageList.innerHTML = '';
  history.forEach(renderEntry);
  renderUserList(users);
  scrollToBottom();
  el.messageInput.focus();
}

function renderUserList(users) {
  el.userList.innerHTML = '';
  users.forEach((name) => {
    const li = document.createElement('li');
    li.textContent = name + (name === myUsername ? ' (you)' : '');
    el.userList.appendChild(li);
  });
}

function renderEntry(entry) {
  const div = document.createElement('div');
  if (entry.type === 'system') {
    div.className = 'msg system';
    div.textContent = entry.text;
  } else {
    const isSelf = entry.username === myUsername;
    div.className = 'msg' + (isSelf ? ' self' : '');
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'msg-username';
    nameSpan.textContent = entry.username;
    const timeSpan = document.createElement('span');
    timeSpan.textContent = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    meta.appendChild(nameSpan);
    meta.appendChild(timeSpan);
    const body = document.createElement('div');
    body.textContent = entry.text;
    div.appendChild(meta);
    div.appendChild(body);
  }
  el.messageList.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  el.messageList.scrollTop = el.messageList.scrollHeight;
}

socket.on('chat_message', renderEntry);
socket.on('system_message', renderEntry);
socket.on('user_list', renderUserList);

el.messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = el.messageInput.value.trim();
  if (!text) return;
  socket.emit('chat_message', text);
  el.messageInput.value = '';
});

el.leaveBtn.addEventListener('click', () => {
  socket.emit('leave_room');
  el.viewRoom.hidden = true;
  el.viewLanding.hidden = false;
  el.messageList.innerHTML = '';
  el.userList.innerHTML = '';
  el.username.value = '';
  myUsername = null;
});
