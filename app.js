const express = require('express')
const app = express()
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser')
app.use(cookieParser("secret"));
app.use( bodyParser.json());
app.use(bodyParser.urlencoded({extended: true }));
require('dotenv').config()
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

async function auth(cookies) {
    if (cookies.id == null) {
        return false
    } else {
        if (tmpUserDB[cookies.id].username != null) {
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
    if (await auth(req.signedCookies)) {
        res.redirect("/")
    } else {
        res.sendFile(dir + "login.html")
    }
});

app.post("/login", async (req, res) => {
    if (await auth(req.signedCookies)) {
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
    if (await auth(req.signedCookies)) {
        res.send("<h1>Success!</h1>")
    } else {
        res.redirect("/login");
    }
});

app.use('/static', express.static('static/resources'))

app.listen(port, () => console.log(`PieBoard Server Host listening on port ${port}!`))
