const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.static('public'));
const server = http.createServer(app);
const io = new Server(server);

let currentSession = null;

function generateCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';

    for (let i = 0; i < 6; i++) {
        code += letters[Math.floor(Math.random() * letters.length)];
    }
    return code;
}

io.on('connection', (socket) => {
    console.log('Client connected: '+ socket.id);

    socket.on('createGame', (playerName) => {
        if (currentSession !== null) {
            const errorMessage = currentSession.status === 'waiting'
                ? 'A game is already in session, please join the current game.'
                : 'A game is already in session, please wait for the current game to finish.';
            socket.emit('createGameFailed', errorMessage);
            return;
        }
        socket.emit('createGameSuccessful');

        currentSession = {
            code: generateCode(),
            status: 'waiting',
            players: [{ id: socket.id, name: playerName, role: null }]
        };

        io.emit('sessionUpdated', currentSession);
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

        currentSession.players.push({ id: socket.id, name: playerName, role: null });

        io.emit('sessionUpdated', currentSession);
    });

});

server.listen(3000, () => {
    console.log(`Server started at http://localhost:3000`);
});