const express = require('express')
const fs = require('fs')
const app = express()
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser')
const md5 = require('md5')
app.use(cookieParser("secret"));
app.use(bodyParser.json({limit: '2gb', extended: true}))
app.use(bodyParser.urlencoded({limit: '2gb', extended: true}))
require('dotenv').config()

const sql = require("./modules/sqlite.js")
const auth = require("./modules/authenticator.js")
const pusher = require("./modules/pusher.js")

const dir = __dirname + "/static/"

app.use('/static', express.static('static/resources'))

app.use('/private/:file', async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        res.sendFile(dir + "/private/" + req.params.file);
    }
});


app.get("/login", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        res.redirect("/")
    } else {
        res.sendFile(dir + "login.html")
    }
});

app.post("/login", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        res.redirect("/")
    } else {
        if (await auth.verifyDetails(req.body.username, req.body.password)) {
            if (await auth.inGroup(req.body.username)) {
                let key = Math.random()
                auth.addNewUser(key, req.body.username);
                res.cookie('id', key, {signed: true})
                res.redirect("/")
            } else {
                res.send("/login?e=ga")
            }
        } else {
            res.redirect("/login?e=do");
        }
    }
});

app.get("/logout", (req, res) => {
    res.clearCookie('id')
    res.redirect("/login")
});
app.get("/", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        res.sendFile(dir + "index.html")
    } else {
        res.redirect("/login");
    }
});

app.get("/api/devices", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        res.send(await sql.query("SELECT name, id FROM devices"))
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/groups", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        res.send(await sql.query("SELECT name, id FROM groups"))
    } else {
        res.send({"error": "NotVerified"});
    }
});


app.get("/api/device/:device", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let data = (await sql.query("SELECT * FROM devices WHERE id = ?", [req.params.device]))
        if (data.length > 0) {
            data = data[0]
            data.groups = JSON.parse(data.groups)
            res.send(data);
        } else {
            res.send({"error": true})
        }
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/group/:group", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        list = (await sql.query("SELECT * FROM groups WHERE id = ?", [req.params.group]))
        if (list.length > 0) {
            list = list[0]
            let slides = await sql.query("SELECT id, member, position, screentime, name, hash, thumbnail as data FROM slides WHERE member = ?", [req.params.group])
            res.send({
                "info": list,
                "slides": slides
            })
        } else {
            res.send({"error": true})
        }
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/device/new", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let max = (await sql.query("SELECT MAX(id) AS id_max FROM devices"))[0].id_max;
        await sql.query("INSERT INTO devices (id, name, groups, port) VALUES(?, ?, ?, ?)", [max+1, `Device ${max+1}`, "[]", 3030]);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/group/new", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let max = (await sql.query("SELECT MAX(id) AS id_max FROM groups"))[0].id_max;
        await sql.query("INSERT INTO groups (id, name, expire) VALUES(?, ?, ?)", [max+1, `Group ${max+1}`, 0]);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/slide/new", (async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        await sql.query("INSERT INTO slides (member, position, screentime, name, hash, data, thumbnail) VALUES(?, ?, ?, ?, ?, ?, ?)", [req.body.member, req.body.position, process.env.DEFUALT_TIME || 10, req.body.name, md5(req.body.data), req.body.data, req.body.thumbnail]);
        pusher.updateDevicesInGroup(req.body.member);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
}));

app.post("/api/device/edit", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        await sql.query("UPDATE devices SET name = ?, ip = ?, groups = ?, authentication = ?, port = ? WHERE id = ?", [req.body.name, req.body.ip, JSON.stringify(req.body.groups), req.body.authentication, req.body.port, req.body.id])
        pusher.pushManifest(req.body.id);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/slide/edit", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        await sql.query("UPDATE slides SET name = ?, screentime = ? WHERE id=?", [req.body.name, req.body.screentime, req.body.id]) // NOT COMPLETE
        pusher.updateDevicesInGroup((await sql.query("SELECT member FROM slides WHERE id = ?", [req.body.id]))[0].member)
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/group/edit", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        await sql.query("UPDATE groups SET name = ?, expire = ? WHERE id= ?", [req.body.name, req.body.expire, req.body.id])
        pusher.updateDevicesInGroup(req.body.id)
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/slide/get/:id", async (req, res) => {
    if (true) { // device authentication
        let content = await sql.query("SELECT data FROM slides WHERE id = ?", [req.params.id])
        if (content.length > 0) {
            res.send(content[0].data);
        } else {
            res.send({"error": true})
        }
    }
});

app.get("/api/device/refresh/:id", async (req, res) => {
    pusher.pushManifest(req.params.id)
    res.send({"res": 0})
});

app.get("/api/device/getnonce/:id", async (req, res) => {
    let info = await sql.query("SELECT manifest FROM devices WHERE id = ?", [req.params.id])
    if (info[0].manifest != null) {
        res.send({"nonce": info[0].manifest})
    } else {
        res.send({"nonce": null})
    }
});

app.post("/api/slide/delete", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let group =  await sql.query("SELECT member FROM slides WHERE id= ?", [req.body.id])
        await sql.query("DELETE FROM slides WHERE id = ?", [req.body.id]);
        pusher.updateDevicesInGroup(group[0].member);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

function removeFromArray(arr, item) {
    for( var i = 0; i < arr.length; i++){ 
        if ( arr[i] === item) {
          arr.splice(i, 1); 
          i--;
        }
     }
     return arr
}

app.post("/api/group/delete", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        await sql.query("DELETE FROM groups WHERE id = ?", [req.body.id])
        await sql.query("DELETE FROM slides WHERE member = ?", [req.body.id])
        let devices = await sql.query('SELECT id, groups FROM devices');
        for (device in devices) {
            let groups = JSON.parse(devices[device].groups)
            if (groups.includes(req.body.id)) {
                groups = removeFromArray(groups, req.body.id);
                await sql.query("UPDATE devices SET groups = ? WHERE id = ?", [JSON.stringify(groups), devices[device].id]);
                await pusher.pushManifest(devices[device].id);
            }
        }
        pusher.updateDevicesInGroup(req.body.id)
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/device/delete", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        await sql.query("DELETE FROM devices WHERE id = ?", [req.body.id])
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});


app.listen(process.env.PI_PORT || 3000, () => console.log(`PieBoard Server Host listening on port ${process.env.PI_PORT}!`))
