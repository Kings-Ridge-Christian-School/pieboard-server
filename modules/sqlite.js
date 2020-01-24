const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('data/data.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS devices (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, ip TEXT, port INT, manifest TEXT, authentication TEXT, lastSuccess INT, groups TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY AUTOINCREMENT, expire INT, name TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS slides (id INTEGER PRIMARY KEY AUTOINCREMENT, member INT, position INT, screentime INT, name TEXT, hash TEXT, data BLOB)");
    db.run("CREATE INDEX IF NOT EXISTS member ON slides(member)")
});

function query(query, data) {
    return new Promise(async (resolve, reject) => {
        db.all(query, data, (err, response) => {
            err ?  reject(err) : resolve(response)
        });
    });
}

exports.query = query