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
        currentSession.players[index].startingRole = 'virus';
        currentSession.players[index].currentRole = 'virus';
    });

    currentSession.players.forEach((player) => {
        if (player.startingRole === null) {
            player.startingRole = 'service';
            player.currentRole = 'service';
        }
    });

    return { playerCount, virusCount };
}

// Anonymous Tip reveals the agency of a random player.
function AnonymousTip(currPlayerID, currentSession) {
    let otherPlayerIDs = []
    currentSession.players.forEach((player) => {
        if (player.id !== currPlayerID) {
            otherPlayerIDs.push(player.id);
        }
    });

    let tippedPlayerID = otherPlayerIDs[Math.floor(Math.random() * otherPlayerIDs.length)];

    let tippedPlayerName;
    let tippedPlayerRole;
    currentSession.players.forEach((player) => {
        if (player.id === tippedPlayerID) {
            tippedPlayerName = player.name;
            tippedPlayerRole = player.currentRole;
        }
    });

    // Returns the tipped player's name and role for current player.
    return { tippedPlayerName, tippedPlayerRole };
}

// Danish Intelligence reveals that between 2 random players, one is virus and one is not.
function DanishIntelligence(currPlayerID, currentSession) {
    let otherServiceIDs = []
    let otherVirusIDs = []

    currentSession.players.forEach((player) => {
        if (player.id !== currPlayerID) {

            if (player.currentRole === 'service') {
                otherServiceIDs.push(player.id);
            } else {
                otherVirusIDs.push(player.id);
            }
        }
    });

    let tippedServiceID = otherServiceIDs[Math.floor(Math.random() * otherServiceIDs.length)];
    let tippedVirusID;

    if (otherVirusIDs.length === 0) {
        tippedVirusID = currPlayerID;
    } else {
        tippedVirusID = otherVirusIDs[Math.floor(Math.random() * otherVirusIDs.length)];
    }

    let tippedServiceName;
    let tippedVirusName;
    currentSession.players.forEach((player) => {
        if (player.id === tippedServiceID) {
            tippedServiceName = player.name;
        } else if (player.id === tippedVirusID) {
            tippedVirusName = player.name;
        }
    });

    const tippedPlayerNames = [tippedServiceName, tippedVirusName];
    if (Math.random() < 0.5) {
        tippedPlayerNames.reverse();
    }

    // Returns the 2 random players' names.
    return tippedPlayerNames;
}

// OldPhotographs reveals 2 random players that worked for the same agency at the start of the game.
function OldPhotographs(currentSession) {
    let playerIDsOfTippedRole = [];
    const tippedRole = randomInt(0, 1) === 0 ? 'service' : 'virus';

    currentSession.players.forEach((player) => {
        if (player.startingRole === tippedRole) {
            playerIDsOfTippedRole.push(player.id);
        }
    });

    let selectedIndexesOfTippedRole = [];

    let indexedPlayer = randomInt(0, playerIDsOfTippedRole.length - 1);
    selectedIndexesOfTippedRole.push(indexedPlayer);
    while (selectedIndexesOfTippedRole.includes(indexedPlayer)) {
        indexedPlayer = randomInt(0, playerIDsOfTippedRole.length - 1);
    }
    selectedIndexesOfTippedRole.push(indexedPlayer);

    const selectedPlayerIDsOfTippedRole = [playerIDsOfTippedRole[selectedIndexesOfTippedRole[0]], playerIDsOfTippedRole[selectedIndexesOfTippedRole[1]]];
    let tippedPlayerNames = [];
    currentSession.players.forEach((player) => {
        if (player.id === selectedPlayerIDsOfTippedRole[0] || player.id === selectedPlayerIDsOfTippedRole[1]) {
            tippedPlayerNames.push(player.name);
        }
    });

    // Returns the 2 random players' names.
    return tippedPlayerNames;
}

// Confession reveals the player's agency to another player of choice.
function Confession(currPlayerID, currentSession){
    let currPlayerName;
    let currPlayerRole;
    currentSession.players.forEach((player) => {
        if (player.id === currPlayerID) {
            currPlayerName = player.name;
            currPlayerRole = player.currentRole;
        }
    });

    // Returns the current player's name and role for confession.
    return {currPlayerName, currPlayerRole};
}

// Secret Intel reveals whether either of 2 selected players work for the virus.
function SecretIntel(player1ID, player2ID, currentSession) {
    let player1Name;
    let player1Role;
    let player2Name;
    let player2Role;

    currentSession.players.forEach((player) => {
        if (player.id === player1ID) {
            player1Name = player.name;
            player1Role = player.currentRole;

        } else if (player.id === player2ID) {
            player2Name = player.name;
            player2Role = player.currentRole;
        }
    });

    let secretIntelMessage;
    if (player1Role === 'virus' || player2Role === 'virus') {
        secretIntelMessage = 'The intel reveals that at least one of them is a VIRUS agent!'
    } else {
        secretIntelMessage = 'The intel reveals that both agents are loyal to The Service'
    }

    // Returns the 2 selected players' names and the corresponding display message.
    return {player1Name, player2Name, secretIntelMessage};
}

// Operation Scapegoat alters the player's win condition; they only win if they get voted out, in which case everyone else loses.
function OperationScapeGoat(currPlayerID, currentSession) {
    currentSession.players.forEach((player) => {
        if (player.id === currPlayerID) {
            player.scapeGoat = true;
        }
    });
}

// Grudge alters the player's win condition; they only win if the allocated player is imprisoned.
function Grudge(currPlayerID, currentSession) {
    let otherPlayerIDs = [];
    currentSession.players.forEach((player) => {
        if (player.id !== currPlayerID) {
            otherPlayerIDs.push(player.id);
        }
    });

    const grudgedPlayerID = otherPlayerIDs[Math.floor(Math.random() * otherPlayerIDs.length)];
    let grudgedPlayerName;
    currentSession.players.forEach((player) => {
        if (player.id === grudgedPlayerID) {
            grudgedPlayerName = player.name;
        } else if (player.id === currPlayerID) {
            player.grudge = grudgedPlayerID;
        }
    });

    // Returns the current player's name.
    return grudgedPlayerName;
}

// Infatuation alters the player's win condition; they only win if the allocated player wins.
function Infatuation(currPlayerID, currentSession) {
    let otherPlayerIDs = [];
    currentSession.players.forEach((player) => {
        if (player.id !== currPlayerID) {
            otherPlayerIDs.push(player.id);
        }
    });

    const infatuatedPlayerID = otherPlayerIDs[Math.floor(Math.random() * otherPlayerIDs.length)];
    let infatuatedPlayerName;
    currentSession.players.forEach((player) => {
        if (player.id === infatuatedPlayerID) {
            infatuatedPlayerName = player.name;
        } else if (player.id === currPlayerID) {
            player.infatuation = infatuatedPlayerID;
        }
    });

    // Returns the current player's name.
    return infatuatedPlayerName;
}

// SleepAgent alters the player's win condition; they now work for the other agency.
function SleeperAgent(currPlayerID, currentSession) {
    let currentRole;
    let currPlayerName;
    currentSession.players.forEach((player) => {
        if (player.id === currPlayerID) {
            currPlayerName = player.name;
            currentRole = player.currentRole;
        }
    });

    const newRole = currentRole === 'service' ? 'virus' : 'service';
    currentSession.players.forEach((player) => {
        if (player.id === currPlayerID) {
            player.currentRole = newRole;
        }
    });

    // Returns the current player's name.
    return currPlayerName;
}

//TODO: OPERATION FUNCTIONS NEED ASSIGNING TO VARIABLES
function HiddenAgenda(currPlayerID, currentSession) {
    const subOperations = ['operationScapeGoat', 'grudge', 'infatuation', 'sleeperAgent', 'secretTip'];
    const selectedSubOperation = subOperations[Math.floor(Math.random() * subOperations.length)];

    switch (selectedSubOperation) {
        case 'operationScapeGoat':
            return OperationScapeGoat(currPlayerID, currentSession);
        case 'grudge':
            return Grudge(currPlayerID, currentSession);
        case 'infatuation':
            return Infatuation(currPlayerID, currentSession);
        case 'sleeperAgent':
            return SleeperAgent(currPlayerID, currentSession);
        case 'secretTip':
            return AnonymousTip(currPlayerID, currentSession);
    }
}

function allocateOperations(currentSession) {
    const startOperations = ['anonymousTip', 'danishIntelligence', 'oldPhotographs', 'confession', 'secretIntel', 'hiddenAgenda'];
    let currentOperations = [...startOperations];

    currentSession.players.forEach((player) => {
        const selectedOperationIndex = Math.floor(Math.random() * currentOperations.length);
        const selectedOperation = currentOperations[selectedOperationIndex];
        currentOperations.splice(selectedOperationIndex, 1);
        if (currentOperations.length === 0) {
            currentOperations = [...startOperations];
        }

        player.operation = selectedOperation;
    });
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

        // CURRENT SESSION BLUEPRINT
        currentSession = {
            code: generateCode(),
            status: 'waiting',
            players: [{ id: socket.id, name: playerName, startingRole: null, currentRole: null , operation: null, scapeGoat: false, grudge: null, infatuation: null}]
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

        currentSession.players.push({ id: socket.id, name: playerName, startingRole: null , currentRole: null , operation: null, scapeGoat: false , grudge: null, infatuation: null });

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
            if (player.startingRole === 'virus') {
                virusPlayerNames.push(player.name);
            }
        });

        currentSession.players.forEach((player) => {
            if (player.startingRole === 'virus') {
                io.to(player.id).emit('virusPlayers', player.name, virusPlayerNames);
            }
        });

        currentSession.players.forEach((player) => {
            io.to(player.id).emit('roleAssigned', player.startingRole, playerCount, virusCount);
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

            //OPERATION PHASE STARTS HERE

            allocateOperations(currentSession);
            for (let i = 0; i < currentSession.players.length; i++) {
                let lastOperation = false;
                const initialPlayerID = currentSession.players[i].id;
                const initialPlayerOperation = currentSession.players[i].operation;
                const activeSocket = io.sockets.sockets.get(initialPlayerID);

                if (i === 0) {
                    const nextPlayerID = currentSession.players[i+1].id;
                    const nextPlayerOperation = currentSession.players[i+1].operation;

                    currentSession.players.forEach((player) => {
                        io.to(player.id).emit('operationTurn', initialPlayerOperation, initialPlayerID);
                    });

                    activeSocket.once('currentOperationCompleted', () => {
                        currentSession.players.forEach((player) => {
                            io.to(player.id).emit('operationTurn', nextPlayerOperation, nextPlayerID);
                        });
                    });
                } else if (i+1 !== currentSession.players.length) {
                    if (i+1 === (currentSession.players.length - 1)) {
                        lastOperation = true;
                    } else {
                        const nextPlayerID = currentSession.players[i+1].id;
                        const nextPlayerOperation = currentSession.players[i+1].operation;

                        activeSocket.once('currentOperationCompleted', () => {
                            currentSession.players.forEach((player) => {
                                io.to(player.id).emit('operationTurn', nextPlayerOperation, nextPlayerID);
                            });
                        });
                    }
                }

                if (lastOperation) {
                    const nextPlayerID = currentSession.players[i+1].id;
                    const nextPlayerOperation = currentSession.players[i+1].operation;

                    activeSocket.once('currentOperationCompleted', () => {
                        currentSession.players.forEach((player) => {
                            io.to(player.id).emit('finalOperationTurn', nextPlayerOperation, nextPlayerID);
                        });
                    });
                }
            }
        }
    });

    socket.on('requestAnonymousTip', (playerID) => {
        const { tippedPlayerName, tippedPlayerRole } = AnonymousTip(playerID, currentSession);
        let playerName;
        currentSession.players.forEach((player) => {
            if (player.id === playerID) {
                playerName = player.name;
            }
        });

        currentSession.players.forEach((player) => {
            io.to(player.id).emit('publicAnonymousTip', playerName);
        });
        socket.emit('privateAnonymousTip', playerName, tippedPlayerName, tippedPlayerRole);
    });

    socket.on('requestFinishAnonymousTip', () => {
        currentSession.players.forEach((player) => {
            io.to(player.id).emit('finishAnonymousTip');
        });
    });

    socket.on('requestDanishIntelligence', (playerID) => {
        const tippedPlayerNames = DanishIntelligence(playerID, currentSession);
        let playerName;
        currentSession.players.forEach((player) => {
            if (player.id === playerID) {
                playerName = player.name;
            }
        });

        currentSession.players.forEach((player) => {
           io.to(player.id).emit('publicDanishIntelligence', playerName);
        });
        socket.emit('privateDanishIntelligence', playerName, tippedPlayerNames);
    });

    socket.on('requestFinishDanishIntelligence', () => {
        currentSession.players.forEach((player) => {
            io.to(player.id).emit('finishDanishIntelligence');
        });
    });

});

server.listen(3000, () => {
    console.log(`Server started at http://localhost:3000`);
});