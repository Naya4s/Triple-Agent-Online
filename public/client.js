const socket = io();

socket.on('connect', () => {
    console.log('Connected to server!');
});

const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');

settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
});

let playerName = ''

const guestBtn = document.getElementById('guestBtn');
const guestWarningPopup = document.getElementById('guestWarningPopup');
const guestNoBtn = document.getElementById('guestNoBtn');
const guestYesBtn = document.getElementById('guestYesBtn');
const guestPlayerNamePopup = document.getElementById('guestPlayerNamePopup');
const guestPlayerNameInput = document.getElementById('guestPlayerNameInput');
const cancelPlayerNameBtn = document.getElementById('cancelPlayerNameBtn');
const createPlayerNameBtn = document.getElementById('createPlayerNameBtn');

guestBtn.addEventListener('click', () => {
    guestWarningPopup.classList.remove('hidden');
});

guestNoBtn.addEventListener('click', () => {
    guestWarningPopup.classList.add('hidden');
});

guestYesBtn.addEventListener('click', () => {
    guestWarningPopup.classList.add('hidden');
    guestPlayerNamePopup.classList.remove('hidden');
});

cancelPlayerNameBtn.addEventListener('click', () => {
    guestPlayerNamePopup.classList.add('hidden');
});

createPlayerNameBtn.addEventListener('click', () => {
    playerName = guestPlayerNameInput.value;
    guestPlayerNamePopup.classList.add('hidden');
});

const loginBtn = document.getElementById('loginBtn');
const loginPopup = document.getElementById('loginPopup');
const loginPlayerNameInput = document.getElementById('loginPlayerNameInput');
const loginPasswordInput = document.getElementById('loginPasswordInput');
const cancelLoginBtn = document.getElementById('cancelLoginBtn');
const confirmLoginBtn = document.getElementById('confirmLoginBtn');

loginBtn.addEventListener('click', () => {
    loginPopup.classList.remove('hidden');
});

cancelLoginBtn.addEventListener('click', () => {
    loginPopup.classList.add('hidden');
});

confirmLoginBtn.addEventListener('click', () => {
    const enteredName = loginPlayerNameInput.value;
    const enteredPassword = loginPasswordInput.value;
    socket.emit('login', enteredName, enteredPassword);
});

socket.on('loginSuccess', (account) => {
    playerName = account.username;
    console.log('Logged in as:', playerName);
    loginPopup.classList.add('hidden');
});

socket.on('loginFailed', (errorMessage) => {
    alert(errorMessage);
});

const signupBtn = document.getElementById('signupBtn');
const signupPopup = document.getElementById('signupPopup');
const signupPlayerNameInput = document.getElementById('signupPlayerNameInput');
const signupPasswordInput = document.getElementById('signupPasswordInput');
const cancelSignupBtn = document.getElementById('cancelSignupBtn');
const confirmSignupBtn = document.getElementById('confirmSignupBtn');

signupBtn.addEventListener('click', () => {
    signupPopup.classList.remove('hidden');
});

cancelSignupBtn.addEventListener('click', () => {
    signupPopup.classList.add('hidden');
});

confirmSignupBtn.addEventListener('click', () => {
    const enteredName = signupPlayerNameInput.value;
    const enteredPassword = signupPasswordInput.value;
    socket.emit('signup', enteredName, enteredPassword);
});

socket.on('signupSuccess', (account) => {
    playerName = account.username;
    console.log('Signed up and logged in as:', playerName);
    signupPopup.classList.add('hidden');
});

socket.on('signupFailed', (errorMessage) => {
    alert(errorMessage);
});

const createGameBtn = document.getElementById('createGameBtn');
createGameBtn.addEventListener('click', () => {
    if (playerName === '') {
        alert('Please enter your name in settings.');
        return;
    }
    socket.emit('createGame', playerName);
});

socket.on('createGameFailed', errorMessage => {
    console.log('Game could not be created:', errorMessage);
    alert(errorMessage);
});

socket.on('sessionUpdated', (currentSession, sessionChange, leavingPlayerName) => {
    console.log('Session updated:', currentSession);

    let numOfPlayers = currentSession.players.length;
    for (let i = 0; i < numOfPlayers; i++) {
        if (socket.id === currentSession.players[i].id) {
            // Under this if statement, the code runs for clients in the session, when the session has been updated.

            if (sessionChange === 'joined') {
                lobbyCode.textContent = currentSession.code;

                lobbyPlayerList.textContent = ''
                currentSession.players.forEach(player => {
                    const li = document.createElement('li');
                    li.textContent = player.name;
                    lobbyPlayerList.appendChild(li);
                });
            }

            if (sessionChange === 'left') {
                const listItems = lobbyPlayerList.querySelectorAll('li');

                listItems.forEach(item => {
                    if (item.textContent === leavingPlayerName) {
                        item.remove();
                    }
                });
            }
        }
    }
});

const homeScreen = document.getElementById('homeScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const lobbyCode = document.getElementById('lobbyCode');
const lobbyPlayerList = document.getElementById('lobbyPlayerList');

socket.on('joining', () => {
    lobbyScreen.classList.remove('hidden');
    homeScreen.classList.add('hidden');
    settingsBtn.classList.add('hidden');
    settingsPanel.classList.add('hidden');
});

socket.on('leaving', () => {
    lobbyScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    settingsBtn.classList.remove('hidden');
    settingsPanel.classList.remove('hidden');
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

socket.on('joinGameFailed', errorMessage => {
    console.log('Could not join game:', errorMessage);
    alert(errorMessage);
});

const startLobbyBtn = document.getElementById('startLobbyBtn');
const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');

leaveLobbyBtn.addEventListener('click', () => {
    socket.emit('leaveLobby');
});

startLobbyBtn.addEventListener('click', () => {
    socket.emit('startGame');
});