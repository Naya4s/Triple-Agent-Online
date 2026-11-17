const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const {createAccount, verifyLogin, usernameExists} = require('./database');

const app = express();
app.use(express.static('public'));
const server = http.createServer(app);
const io = new Server(server);

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';

    for (let i = 0; i < 6; i++) {
        code += letters[Math.floor(Math.random() * letters.length)];
    }
    return code;
}

function isLoggedIn(socketId) {
    for (const username in loggedInAccounts) {
        if (loggedInAccounts[username] === socketId) {
            return true;
        }
    }
    return false;
}

function allocatePlayerRoles(currentSession) {
    const playerCount = currentSession.players.length;
    const virusCount = playerCount <= 6 ? 2 : 3;

    let virusPlayerIndex = [];
    while (virusPlayerIndex.length < virusCount) {
        const randomIndex = randomInt(0, playerCount-1);

        let validRandomIndex = true;
        virusPlayerIndex.forEach((index) => {
            if (index === randomIndex) {
                validRandomIndex = false;
            }
        });

        if (validRandomIndex) {
            virusPlayerIndex.push(randomIndex);
        }
    }

    virusPlayerIndex.forEach((index) => {
        currentSession.players[index].role = 'virus';
    });

    currentSession.players.forEach((player) => {
        if (player.role === null) {
            player.role = 'service';
        }
    });

    return { playerCount, virusCount };
}

let currentSession = null;
let loggedInAccounts = {};
let missionBriefingReadiedPlayers = 0;

io.on('connection', (socket) => {
    console.log('Client connected: '+ socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected: '+ socket.id);

        for (const username in loggedInAccounts) {
            if (loggedInAccounts[username] === socket.id) {
                delete loggedInAccounts[username];
            }
        }

        if (currentSession !== null) {
            let leavingPlayerName;
            for (let i = 0; i < currentSession.players.length; i++) {
                if (currentSession.players[i].id === socket.id) {
                    leavingPlayerName = currentSession.players[i].name;
                    currentSession.players.splice(i, 1);
                }
            }

            if (currentSession.players.length === 0) {
                currentSession = null;
            } else if (leavingPlayerName !== undefined) {
                io.emit('sessionUpdated', currentSession, 'left', leavingPlayerName);
            }
        }
    });

    socket.on('signup', (username, password) => {
        try {
            createAccount(username, password);
            const account = verifyLogin(username, password);
            socket.emit('signupSuccess', account);
        } catch (error) {
            socket.emit('signupFailed', 'That username is already taken.')
        }
    });

    socket.on('login', (username, password) => {
        const account = verifyLogin(username, password);
        if (account === null) {
            socket.emit('loginFailed', 'Incorrect username or password.');
            return;
        }

        if (loggedInAccounts[account.username] !== undefined) {
            socket.emit('loginFailed', 'This account is already logged in.');
            return;
        }

        loggedInAccounts[account.username] = socket.id;
        socket.emit('loginSuccess', account);
    });

    socket.on('createGame', (playerName) => {
        if (currentSession !== null) {
            const errorMessage = currentSession.status === 'waiting'
                ? 'A game is already in session, please join the current game.'
                : 'A game is already in session, please wait for the current game to finish.';
            socket.emit('createGameFailed', errorMessage);
            return;
        }

        if (!isLoggedIn(socket.id) && usernameExists(playerName)) {
            socket.emit('createGameFailed', 'That name is taken by a registered account.');
            return;
        }

        currentSession = {
            code: generateCode(),
            status: 'waiting',
            players: [{ id: socket.id, name: playerName, role: null}]
        };

        socket.emit('joining');
        io.emit('sessionUpdated', currentSession, 'joined');
    });

    socket.on('joinGame', (code, playerName) => {
        if (currentSession === null || currentSession.code !== code) {
            socket.emit('joinGameFailed', 'No session found with that code.');
            return;
        }

        if (currentSession.status !== 'waiting') {
            socket.emit('joinGameFailed', 'This session has already begun.');
            return;
        }

        if (currentSession.players.length >= 9) {
            socket.emit('joinGameFailed', 'This session is full.');
            return;
        }

        if (!isLoggedIn(socket.id) && usernameExists(playerName)) {
            socket.emit('joinGameFailed', 'That name is taken by a registered account.');
            return;
        }

        const nameTaken = currentSession.players.some(player => player.name === playerName);
        if (nameTaken) {
            socket.emit('joinGameFailed', 'That name is already used in this session.');
            return;
        }

        currentSession.players.push({ id: socket.id, name: playerName, role: null });

        socket.emit('joining');
        io.emit('sessionUpdated', currentSession, 'joined');
    });

    socket.on('leaveLobby', () => {
        let leavingPlayerName;
        for (let i = 0; i < currentSession.players.length; i++) {
            if (currentSession.players[i].id === socket.id) {
                leavingPlayerName = currentSession.players[i].name;
                currentSession.players.splice(i, 1);
            }
        }

        socket.emit('leaving');

        if (currentSession.players.length === 0) {
            currentSession = null;
        } else {
            io.emit('sessionUpdated', currentSession, 'left', leavingPlayerName);
        }
    });

    socket.on('startGame', () => {
        if (currentSession.players.length < 5 || currentSession.players.length > 9) {
            socket.emit('startGameFailed', 'Invalid number of players.');
            return;
        }

        currentSession.status = 'inProgress';
        const {playerCount, virusCount } = allocatePlayerRoles(currentSession);

        let virusPlayerNames = [];
        currentSession.players.forEach((player) => {
            if (player.role === 'virus') {
                virusPlayerNames.push(player.name);
            }
        });

        currentSession.players.forEach((player) => {
            if (player.role === 'virus') {
                io.to(player.id).emit('virusPlayers', player.name, virusPlayerNames);
            }
        });

        currentSession.players.forEach((player) => {
            io.to(player.id).emit('roleAssigned', player.role, playerCount, virusCount);
        });

        const safeCurrentSession = {
            code: currentSession.code,
            status: currentSession.status,
            players: currentSession.players.map(player => ({ id: player.id, name: player.name}))
        };

        io.emit('sessionUpdated', safeCurrentSession, 'started');
    });

    socket.on('missionBriefingPlayerIsReady', () => {
        missionBriefingReadiedPlayers++
        const playerCount = currentSession.players.length;

        currentSession.players.forEach((player) => {
            io.to(player.id).emit('missionBriefingReadyIncremented', missionBriefingReadiedPlayers);
        });

        if (missionBriefingReadiedPlayers > (playerCount * 0.5)) {
            currentSession.players.forEach((player) => {
                io.to(player.id).emit('missionBriefingReadySuccess')
            });
            missionBriefingReadiedPlayers = 0;
        }
    });



});

server.listen(3000, () => {
    console.log(`Server started at http://localhost:3000`);
});