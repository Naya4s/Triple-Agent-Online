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

            if (sessionChange === 'started') {

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

const missionBriefingScreen = document.getElementById('missionBriefingScreen');
const missionBriefingText = document.getElementById('missionBriefingText');

let initialMissionBriefingReadiedPlayers = 0;
const missionBriefingReadyBtn = document.getElementById('missionBriefingReadyBtn');

const serviceScreen = document.getElementById('serviceScreen');
const serviceScreenVirusCountText = document.getElementById('serviceScreenVirusCountText');
const virusScreen = document.getElementById('virusScreen');
const virusScreenVirusCountText = document.getElementById('virusScreenVirusCountText');
const virusScreenVirusPlayers = document.getElementById('virusScreenVirusPlayers');

socket.on('virusPlayers', (thisVirusName, virusPlayerNames) => {
    virusScreenVirusPlayers.textContent = '';
    virusPlayerNames.forEach((virusPlayerName) => {
        if (virusPlayerName !== thisVirusName) {
            const li = document.createElement('li');
            li.textContent = virusPlayerName;
            virusScreenVirusPlayers.appendChild(li);
        }
    });
});

let globalPlayerCount;

socket.on('roleAssigned', (role, playerCount, virusCount) => {
    globalPlayerCount = playerCount;
    lobbyScreen.classList.add('hidden');

    missionBriefingText.textContent = `You’ve received intelligence that ${virusCount} of the ${playerCount} of you are double agents working for VIRUS! ` +
        'Your briefing will tell you which agency you work for and your objective. You can only imprison one person so make sure it’s the right one. ' +
        'Remember each other’s names, review the agency logos, and figure out who is lying about who they are.';
    missionBriefingScreen.classList.remove('hidden');

    missionBriefingReadyBtn.textContent = `READY (${initialMissionBriefingReadiedPlayers}/${playerCount})`

    serviceScreenVirusCountText.textContent = `There are ${virusCount} VIRUS agents.`;
    if (virusCount > 2) {
        virusScreenVirusCountText.textContent = `There are ${virusCount - 1} other VIRUS agents working with you.`;
    } else {
        virusScreenVirusCountText.textContent = `There is ${virusCount - 1} other VIRUS agent working with you.`;
    }

    setTimeout(() => {
        missionBriefingScreen.classList.add('hidden');
        missionBriefingReadyBtn.classList.remove('hidden');

        if (role === 'service') {
            serviceScreen.classList.remove('hidden');
        } else if (role === 'virus') {
            virusScreen.classList.remove('hidden');
        }

    }, 5000);
});

missionBriefingReadyBtn.addEventListener('click', () => {
    socket.emit('missionBriefingPlayerIsReady');
    missionBriefingReadyBtn.disabled = true;
});

socket.on('missionBriefingReadyIncremented', (missionBriefingReadiedPlayers) => {
    missionBriefingReadyBtn.textContent = `READY (${missionBriefingReadiedPlayers}/${globalPlayerCount})`
});

const operationsPhaseScreen = document.getElementById('operationsPhaseScreen');
const operationsPhaseText = document.getElementById('operationsPhaseText');
operationsPhaseText.textContent = 'Each person will be given one operation before you move on to the Accusation Phase.';

socket.on('missionBriefingReadySuccess', () => {
    missionBriefingReadyBtn.classList.add('hidden');
    serviceScreen.classList.add('hidden');
    virusScreen.classList.add('hidden');

    operationsPhaseScreen.classList.remove('hidden');
    setTimeout(() => {
        operationsPhaseScreen.classList.add('hidden');
    }, 5000);

});

socket.on('operationTurn', (operation, playerID, lastOperationTurn) => {
    if (socket.id !== playerID) {
        return;
    }

    switch (operation) {
        case 'anonymousTip':
            socket.emit('requestAnonymousTip', playerID, lastOperationTurn);
            break;

        case 'danishIntelligence':
            socket.emit('requestDanishIntelligence', playerID, lastOperationTurn);
            break;

        case 'oldPhotographs':
            socket.emit('requestOldPhotographs', playerID, lastOperationTurn);
            break;

        case 'confession':
            socket.emit('requestConfession', playerID, lastOperationTurn);
            break;

        case 'secretIntel':
            socket.emit('requestSecretIntel', playerID, lastOperationTurn);
            break;

        case 'hiddenAgenda':
            socket.emit('requestHiddenAgenda', playerID, lastOperationTurn);
            break;
    }
});

const waitingOperationScreen = document.getElementById('waitingOperationScreen');

const anonymousTipScreen = document.getElementById('anonymousTipScreen');
const anonymousTipPlayerName = document.getElementById('anonymousTipPlayerName');
const anonymousTipPublicMessage = document.getElementById('anonymousTipPublicMessage');
const anonymousTipPrivateScreen = document.getElementById('anonymousTipPrivateScreen');
const anonymousTipPrivateMessage = document.getElementById('anonymousTipPrivateMessage');
const anonymousTipAgencyLogo = document.getElementById('anonymousTipAgencyLogo');

socket.on('publicAnonymousTip', (playerName) => {
    anonymousTipPlayerName.textContent = playerName;
    if (playerName.at(-1) === 's') {
        anonymousTipPublicMessage.textContent = playerName + '’ source knows the agency of one other agent and reveals it to them.';
    } else {
        anonymousTipPublicMessage.textContent = playerName + '’s source knows the agency of one other agent and reveals it to them.';
    }
    anonymousTipScreen.classList.remove('hidden');
    anonymousTipPublicMessage.classList.remove('hidden');
});

socket.on('privateAnonymousTip', (playerName, tippedPlayerName, tippedPlayerRole, playerID, lastOperation) => {
    setTimeout(() => {
        anonymousTipPublicMessage.classList.add('hidden');
        }, 5000);

    anonymousTipPrivateMessage.textContent = 'After meeting your source at a very remote location, they finally spill the beans. You now know that ' + tippedPlayerName + ' works for:';
    anonymousTipAgencyLogo.src = `assets/${tippedPlayerRole}.png`;
    anonymousTipAgencyLogo.alt = tippedPlayerRole === 'service' ? 'Service Logo' : 'VIRUS Logo';
    anonymousTipPrivateScreen.classList.remove('hidden');

    setTimeout(() => {
        anonymousTipPrivateScreen.classList.add('hidden');
        socket.emit('requestFinishAnonymousTip', playerID, lastOperation);
    }, 5000);
});

socket.on('finishAnonymousTip', (playerID, lastOperation) => {
    anonymousTipScreen.classList.add('hidden');
    anonymousTipPublicMessage.classList.add('hidden');

    if (lastOperation) {

    } else {
        waitingOperationScreen.classList.remove('hidden');
        setTimeout(() => {
            waitingOperationScreen.classList.add('hidden');
            if (playerID === socket.id) {
                socket.emit('requestNextOperation');
            }
        }, 5000);
    }
});

const danishIntelligenceScreen = document.getElementById('danishIntelligenceScreen');
const danishIntelligencePlayerName = document.getElementById('danishIntelligencePlayerName');
const danishIntelligencePublicMessage = document.getElementById('danishIntelligencePublicMessage');
const danishIntelligencePrivateScreen = document.getElementById('danishIntelligencePrivateScreen');
const danishIntelligencePrivateMessage1 = document.getElementById('danishIntelligencePrivateMessage1');
const danishIntelligencePrivateMessage3 = document.getElementById('danishIntelligencePrivateMessage3');

socket.on('publicDanishIntelligence', (playerName) => {
    danishIntelligencePlayerName.textContent = playerName;
    danishIntelligencePublicMessage.textContent = playerName + ' intercepts a transmission with two names: one is a VIRUS agent and the other is not.';

    danishIntelligenceScreen.classList.remove('hidden');
    danishIntelligencePublicMessage.classList.remove('hidden');
});

socket.on('privateDanishIntelligence', (playerName, tippedPlayerNames, playerID, lastOperation) => {
    setTimeout(() => {
        danishIntelligencePublicMessage.classList.add('hidden');
    }, 5000);

    danishIntelligencePrivateMessage1.textContent = 'The transmission names ' + tippedPlayerNames[0] + ' and ' + tippedPlayerNames[1] + '. One of them is a VIRUS agent and the other is not. ' +
                                                    'Too bad you aren’t good enough at Danish to know who is on what team.';
    danishIntelligencePrivateMessage3.textContent = tippedPlayerNames[0] + ' & ' + tippedPlayerNames[1];
    danishIntelligencePrivateScreen.classList.remove('hidden');

    setTimeout(() => {
        danishIntelligencePrivateScreen.classList.add('hidden');
        socket.emit('requestFinishDanishIntelligence', playerID, lastOperation);
    }, 5000);
});

socket.on('finishDanishIntelligence', (playerID, lastOperation) => {
    danishIntelligenceScreen.classList.add('hidden');
    danishIntelligencePublicMessage.classList.add('hidden');

    if (lastOperation) {

    } else {
        waitingOperationScreen.classList.remove('hidden');
        setTimeout(() => {
            waitingOperationScreen.classList.add('hidden');
            if (playerID === socket.id) {
                socket.emit('requestNextOperation');
            }
        }, 5000);
    }
});