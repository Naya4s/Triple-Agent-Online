const socket = io();

socket.on('connect', () => {
    console.log('Connected to server!');
});

const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');

settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
});

const playerNameBtn = document.getElementById('playerNameBtn');
const playerNamePopup = document.getElementById('playerNamePopup');

playerNameBtn.addEventListener('click', () => {
    playerNamePopup.classList.remove('hidden');
});

const playerNameInput = document.getElementById('playerNameInput');
const cancelNameBtn = document.getElementById('cancelNameBtn');
const createNameBtn = document.getElementById('createNameBtn');

let playerName = ''

cancelNameBtn.addEventListener('click', () => {
    playerNamePopup.classList.add('hidden');
});

createNameBtn.addEventListener('click', () => {
    playerName = playerNameInput.value;
    console.log('Player name set to:', playerName);
    playerNamePopup.classList.add('hidden');
});

const createGameBtn = document.getElementById('createGameBtn');
createGameBtn.addEventListener('click', () => {
    if (playerName === '') {
        alert('Please enter your name in settings.');
        return;
    }
    socket.emit('createGame', playerName);
});

socket.on('sessionUpdated', currentSession => {
    console.log('Session updated:', currentSession);
});

socket.on('createGameFailed', errorMessage => {
    console.log('Game could not be created:', errorMessage);
    alert(errorMessage);
});

const homeScreen = document.getElementById('homeScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const lobbyCode = document.getElementById('lobbyCode');
const lobbyPlayerList = document.getElementById('lobbyPlayerList');

socket.on('sessionUpdated', currentSession => {
    numOfPlayers = currentSession.players.length;
    for (let i = 0; i < numOfPlayers; i++) {
        if (socket.id === currentSession.players[i].id) {

            homeScreen.classList.add('hidden');
            lobbyScreen.classList.remove('hidden');

            lobbyCode.textContent = currentSession.code;

            lobbyPlayerList.textContent = ''
            currentSession.players.forEach(player => {
                const li = document.createElement('li');
                li.textContent = player.name;
                lobbyPlayerList.appendChild(li);
            });
        }
    }
});

const joinGameBtn = document.getElementById('joinGameBtn');
const joinCodePopup = document.getElementById('joinCodePopup');
const joinCodeInput = document.getElementById('joinCodeInput');
const cancelCodeBtn = document.getElementById('cancelCodeBtn');
const joinCodeBtn = document.getElementById('joinCodeBtn');

joinGameBtn.addEventListener('click', () => {
    if (playerName === '') {
        alert('Please set your player name first.');
        return;
    }
    joinCodePopup.classList.remove('hidden');
});

cancelCodeBtn.addEventListener('click', () => {
    joinCodePopup.classList.add('hidden');
});

joinCodeBtn.addEventListener('click', () => {
    const code = joinCodeInput.value;
    socket.emit('joinGame', code, playerName);
    joinCodePopup.classList.add('hidden');
});