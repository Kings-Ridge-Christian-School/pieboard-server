const express = require('express')
const fs = require('fs')
const app = express()
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose();

app.use(cookieParser("secret"));
app.use( bodyParser.json());
app.use(bodyParser.urlencoded({extended: true }));
require('dotenv').config()

var db = new sqlite3.Database('data/data.db');
db.serialize(() => {
db.run("CREATE TABLE IF NOT EXISTS devices (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, ip TEXT, groups TEXT)");
db.run("CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
db.run("CREATE TABLE IF NOT EXISTS slides (id INTEGER PRIMARY KEY AUTOINCREMENT, member INT, expire INT, name TEXT)");
});

const ActiveDirectory = require('activedirectory');
const dir = __dirname + "/static/"

const config = { url: process.env.AD_URL,
               baseDN: process.env.AD_BASEDN,
               username: process.env.AD_USERNAME,
               password: process.env.AD_PASSWORD }

const port = process.env.PI_PORT
const authGroup = process.env.PI_AUTH_GROUP

var ad = new ActiveDirectory(config);
var tmpUserDB = {}

function inGroup(username) {
    return new Promise(async (resolve) => {
        ad.isUserMemberOf(username, authGroup, (err, auth) => {
            auth ? resolve(true) : resolve(false)
        });
    });
}

function verifyDetails(username, password) {
    return new Promise(async (resolve) => {
        ad.authenticate(username, password, (err, auth) => {
            auth ? resolve(true) : resolve(false)
        });
    });
}

async function check(cookies) {
    if (cookies.id == null) {
        return false
    } else {
        if (tmpUserDB[cookies.id] != null) {
            if (await inGroup(tmpUserDB[cookies.id].username)) {
                return true
            } else {
                return false
            }
        } else {
            return false
        }
    }
}

app.get("/login", async (req, res) => {
    if (await check(req.signedCookies)) {
        res.redirect("/")
    } else {
        res.sendFile(dir + "login.html")
    }
});

app.post("/login", async (req, res) => {
    if (await check(req.signedCookies)) {
        res.redirect("/")
    } else {
        if (await verifyDetails(req.body.username, req.body.password)) {
            if (await inGroup(req.body.username)) {
                let key = Math.random()
                tmpUserDB[key] = {
                    "username": req.body.username,
                    "authTime": new Date()
                }
                res.cookie('id', key, {signed: true})
                res.redirect("/")
            } else {
                res.send("Group authentication failure for " + req.body.username)
            }
        } else {
            res.send("Detail authentication failure for " + req.body.username);
        }
    }
});

app.get("/logout", (req, res) => {
    res.clearCookie('id')
    res.redirect("/login")
});
app.get("/", async (req, res) => {
    if (await check(req.signedCookies)) {
        res.sendFile(dir + "index.html")
    } else {
        res.redirect("/login");
    }
});

app.use('/static', express.static('static/resources'))

app.get("/api/devices", async (req, res) => {
    if (await check(req.signedCookies)) {
        db.all("SELECT name, id FROM devices", (err, list) => {
            res.send(list)
        });
    }
});

app.get("/api/groups", async (req, res) => {
    if (await check(req.signedCookies)) {
        db.all("SELECT name, id FROM groups", (err, list) => {
            res.send(list)
        });
    }
});

app.get("/api/group/:group", async (req, res) => {
    if (await check(req.signedCookies)) {
        db.get("SELECT * FROM groups WHERE id = ?", [req.params.group], (err, list) => {
            res.send(list)
        });
    }
});

app.get("/api/device/:device", async (req, res) => {
    if (await check(req.signedCookies)) {
        db.get("SELECT * FROM devices WHERE id = ?", [req.params.device], (err, list) => {
            list.groups = JSON.parse(list.groups)
            res.send(list)
        });
    }
});

app.listen(port, () => console.log(`PieBoard Server Host listening on port ${port}!`))
