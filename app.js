const express = require('express')
const fs = require('fs')
const app = express()
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser')

app.use(cookieParser("secret"));
app.use(bodyParser.json({limit: '2gb', extended: true}))
app.use(bodyParser.urlencoded({limit: '2gb', extended: true}))
require('dotenv').config()

const sql = require("./modules/sqlite.js")
const auth = require("./modules/authenticator.js")

const dir = __dirname + "/static/"

app.use('/static', express.static('static/resources'))

app.use('/private/:file', async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        res.sendFile(dir + "/private/" + req.params.file);
    }
});


app.get("/login", async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        res.redirect("/")
    } else {
        res.sendFile(dir + "login.html")
    }
});

app.post("/login", async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        res.redirect("/")
    } else {
        if (await auth.verifyDetails(req.body.username, req.body.password)) {
            if (await auth.inGroup(req.body.username)) {
                let key = Math.random()
                auth.addNewUser(key, req.body.username);
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
    if (await auth.check(req.signedCookies)) {
        res.sendFile(dir + "index.html")
    } else {
        res.redirect("/login");
    }
});

app.get("/api/devices", async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        res.send(await sql.query("SELECT name, id FROM devices"))
    }
});

app.get("/api/groups", async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        res.send(await sql.query("SELECT name, id FROM groups"))
    }
});


app.get("/api/device/:device", async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        let data = (await sql.query("SELECT * FROM devices WHERE id = ?", [req.params.device]))[0]
        data.groups = JSON.parse(data.groups)
        res.send(data);
    }
});

app.get("/api/group/:group", async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        list = (await sql.query("SELECT * FROM groups WHERE id = ?", [req.params.group]))[0]
        slides = await sql.query("SELECT * FROM slides WHERE member = ?", [req.params.group])
        res.send({
            "info": list,
            "slides": slides
        })
    }
});

app.post("/api/device/new", async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        max = (await sql.query("SELECT MAX(id) AS id_max FROM devices"))[0].id_max;
        await sql.query("INSERT INTO devices (id, name, groups) VALUES(?, ?, ?)", [max+1, `Device ${max+1}`, "[]"]);
        res.send({"res": 0});
    }
});

app.post("/api/group/new", async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        max = (await sql.query("SELECT MAX(id) AS id_max FROM groups"))[0].id_max;
        await sql.query("INSERT INTO groups (id, name, expire) VALUES(?, ?, ?)", [max+1, `Group ${max+1}`, 0]);
        res.send({"res": 0});
    }
});

app.post("/api/slide/new", (async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        await sql.query("INSERT INTO slides (member, position, screentime, name, data) VALUES(?, ?, ?, ?, ?)", [req.body.member, req.body.position, process.env.DEFUALT_TIME, req.body.name, req.body.data]);
        res.send({"res": 0});
    }
}));

app.post("/api/device/edit", async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        await sql.query("UPDATE devices SET name = ?, ip = ?, groups = ? WHERE id = ?", [req.body.name, req.body.ip, JSON.stringify(req.body.groups), req.body.id])
        res.send({"res": 0});
    }
});

app.post("/api/slide/edit", async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        await sql.query("UPDATE slides SET name = ?, screentime = ? WHERE id=?", [req.body.name, req.body.screentime, req.body.id]) // NOT COMPLETE
        res.send({"res": 0});
    }
});

app.post("/api/group/edit", async (req, res) => {
    if (await auth.check(req.signedCookies)) {
        await sql.query("UPDATE groups SET name = ?, expire = ? WHERE id= ?", [req.body.name, req.body.expire, req.body.id])
        res.send({"res": 0});
    }
});

app.listen(process.env.PI_PORT, () => console.log(`PieBoard Server Host listening on port ${process.env.PI_PORT}!`))
