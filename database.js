const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database('tripleagent.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        wins INTEGER DEFAULT 0,
        isAdmin INTEGER DEFAULT 0
    )
`);

function createAccount(username, plainPassword) {
    const passwordHash = bcrypt.hashSync(plainPassword, 10);

    const stmt = db.prepare('INSERT INTO players (username, passwordHash) VALUES (?, ?)');
    stmt.run(username, passwordHash);
}

function verifyLogin(username, plainPassword) {
    const row = db.prepare('SELECT * FROM players WHERE username = ?').get(username);
    if (!row) {
        return null;
    }

    const passwordMatches = bcrypt.compareSync(plainPassword, row.passwordHash);
    if (!passwordMatches) {
        return null;
    }
    return row;
}

function usernameExists(username) {
    const row = db.prepare('SELECT * FROM players WHERE username = ?').get(username);
    return row !== undefined;
}
// const row = db.prepare('SELECT * FROM players WHERE username = ?').get('testUser4');
// console.log(row);
module.exports = { db, createAccount, verifyLogin, usernameExists };