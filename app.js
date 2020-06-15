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

app.get("/api/slideshows", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        res.send(await sql.query("SELECT name, id FROM slideshows"))
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
            data.slideshows = JSON.parse(data.slideshows)
            res.send(data);
        } else {
            res.send({"error": true})
        }
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/slideshow/:slideshow", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        list = (await sql.query("SELECT * FROM slideshows WHERE id = ?", [req.params.slideshow]))
        if (list.length > 0) {
            list = list[0]
            let slides = await sql.query("SELECT id, member, position, screentime, name, hash FROM slides WHERE member = ? ORDER BY position ASC", [req.params.slideshow])
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

app.get("/api/group/:group", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let data = await sql.query("SELECT * FROM groups WHERE id = ?", req.params.group)
        let devices = await sql.query("SELECT id, name, devgroup FROM devices")
        if (data.length > 0) {
            data = data[0]
            data.devices = devices
            res.send(data);
        } else {
            res.send({"error": true})
        }
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/slide/thumbnail/:id", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let slide = await sql.query("SELECT thumbnail FROM slides WHERE id = ?", req.params.id)
        var img = Buffer.from(slide[0].thumbnail.replace("data:image/png;base64,", ""), 'base64');
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': img.length
        });
        res.end(img); 
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/device/new", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let max = (await sql.query("SELECT MAX(id) AS id_max FROM devices"))[0].id_max;
        await sql.query("INSERT INTO devices (id, name, slideshows, port) VALUES(?, ?, ?, ?)", [max+1, `Device ${max+1}`, "[]", 3030]);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/slideshow/new", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let max = (await sql.query("SELECT MAX(id) AS id_max FROM slideshows"))[0].id_max;
        await sql.query("INSERT INTO slideshows (id, name, expire) VALUES(?, ?, ?)", [max+1, `Slideshow ${max+1}`, 0]);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/group/new", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let max = (await sql.query("SELECT MAX(id) AS id_max FROM groups"))[0].id_max;
        await sql.query("INSERT INTO groups (id, name, slideshows) VALUES(?, ?, ?)", [max+1, `Group ${max+1}`, "[]"]);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/slide/new", (async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let currentMax = await sql.query("SELECT position FROM slides WHERE member = ? ORDER BY position DESC LIMIT 1", req.body.member);
        if (currentMax.length == 0) position = 0
        else position = currentMax[0].position + 1
        await sql.query("INSERT INTO slides (member, position, screentime, name, hash, data, thumbnail) VALUES(?, ?, ?, ?, ?, ?, ?)", [req.body.member, position, process.env.DEFUALT_TIME || 10, req.body.name, md5(req.body.data), req.body.data, req.body.thumbnail]);
        pusher.updateDevicesWithSlideshow(req.body.member);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
}));

app.post("/api/slide/move", (async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        if (req.body.originalPos > req.body.newPos) {
            let toChange = await sql.query("SELECT position, id FROM slides WHERE member = ? AND position >= ? AND position <= ?", [req.body.slideshow, req.body.newPos, req.body.originalPos])
            for (let slide of toChange) {
                if (slide.position >= req.body.newPos && slide.position < req.body.originalPos) slide.position += 1
                else if (slide.position == req.body.originalPos) slide.position = req.body.newPos
                await sql.query("UPDATE slides SET position = ? WHERE id = ?", [slide.position, slide.id]);
            }
        } else if (req.body.originalPos < req.body.newPos) {
            let toChange = await sql.query("SELECT position, id FROM slides WHERE member = ? AND position >= ? AND position <= ?", [req.body.slideshow, req.body.originalPos, req.body.newPos])
            for (let slide of toChange) {
                if (slide.position <= req.body.newPos && slide.position > req.body.originalPos) slide.position -= 1
                else if (slide.position == req.body.originalPos) slide.position = req.body.newPos
                await sql.query("UPDATE slides SET position = ? WHERE id = ?", [slide.position, slide.id]);
            }
        } else {}
        pusher.updateDevicesWithSlideshow(req.body.slideshow);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
}));

app.post("/api/device/edit", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let inDevGroup = await sql.query("SELECT devgroup, slideshows FROM devices WHERE id = ?", req.body.id)
        if (inDevGroup[0].devgroup != null) req.body.slidshows = inDevGroup[0].slideshows
        await sql.query("UPDATE devices SET name = ?, ip = ?, slideshows = ?, authentication = ?, port = ? WHERE id = ?", [req.body.name, req.body.ip, JSON.stringify(req.body.slideshows), req.body.authentication, req.body.port, req.body.id])
        pusher.pushManifest(req.body.id);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/slide/edit", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        await sql.query("UPDATE slides SET name = ?, screentime = ? WHERE id=?", [req.body.name, req.body.screentime, req.body.id]) // NOT COMPLETE
        pusher.updateDevicesWithSlideshow((await sql.query("SELECT member FROM slides WHERE id = ?", [req.body.id]))[0].member)
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/group/edit", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        await sql.query("UPDATE groups SET name = ?, slideshows = ? WHERE id = ?", [req.body.name, JSON.stringify(req.body.slideshows), req.body.id])
        for (let device of req.body.devices) {
            await sql.query("UPDATE devices SET slideshows = ?, devgroup = ? WHERE id = ?", [JSON.stringify(req.body.slideshows), req.body.id, device])
            pusher.pushManifest(device);
        }
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/slideshow/edit", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        await sql.query("UPDATE slideshows SET name = ?, expire = ? WHERE id= ?", [req.body.name, req.body.expire, req.body.id])
        pusher.updateDevicesWithSlideshow(req.body.id)
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
        let slideInfo =  await sql.query("SELECT member, position FROM slides WHERE id= ?", [req.body.id])
        await sql.query("DELETE FROM slides WHERE id = ?", [req.body.id]);
        let slides = sql.query("SELECT id, position FROM slides WHERE member = ? AND position > ?", [slideInfo[0].member, slideInfo[0].position]);
        for (let slide in slides) {
            await sql.query("UPDATE slides SET position = ? WHERE id = ?", [slides[slide].position-1, slides[slide].id]);
        }
        pusher.updateDevicesWithSlideshow(slideInfo[0].member);
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

app.post("/api/slideshow/delete", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        await sql.query("DELETE FROM slideshows WHERE id = ?", [req.body.id])
        await sql.query("DELETE FROM slides WHERE member = ?", [req.body.id])
        let devices = await sql.query('SELECT id, slideshows FROM devices');
        for (device in devices) {
            let slideshows = JSON.parse(devices[device].slideshows)
            if (slideshows.includes(req.body.id)) {
                slideshows = removeFromArray(slideshows, req.body.id);
                await sql.query("UPDATE devices SET slideshows = ? WHERE id = ?", [JSON.stringify(slideshows), devices[device].id]);
                await pusher.pushManifest(devices[device].id);
            }
        }
        pusher.updateDevicesWithSlideshow(req.body.id)
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



let server = app.listen(process.env.PI_PORT || 3000, () => console.log(`PieBoard Server Host listening on port ${process.env.PI_PORT}!`))

function stop() {
    server.close()
}

module.exports = app
module.exports.close = stop