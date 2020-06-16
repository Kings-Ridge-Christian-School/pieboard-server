const sqlite3 = require('sqlite3').verbose();
require('dotenv').config()

var db = process.env.TEST_ENV == 1 ? new sqlite3.Database(':memory:') : new sqlite3.Database('data/data.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS devices (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, ip TEXT, port INT, manifest TEXT, authentication TEXT, devgroup INT, lastSuccess INT, slideshows TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS slideshows (id INTEGER PRIMARY KEY AUTOINCREMENT, expire INT, name TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, slideshows TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS slides (id INTEGER PRIMARY KEY AUTOINCREMENT, member INT, position INT, screentime INT, name TEXT, hash TEXT, data BLOB, thumbnail BLOB)");
    db.run("CREATE INDEX IF NOT EXISTS member ON slides(member)")
    db.run("CREATE INDEX IF NOT EXISTS position ON slides(position)")
    db.run("CREATE INDEX IF NOT EXISTS devgroup ON devices(devgroup)")
});

function query(query, data) {
    return new Promise(async (resolve, reject) => {
        db.all(query, data, (err, response) => {
            err ?  reject(err) : resolve(response)
        });
    });
}

exports.query = query