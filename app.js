const express = require('express')
const fs = require('fs')
const app = express()
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser')
const uuid = require("uuid")
const md5 = require("md5")
const imageThumbnail = require("image-thumbnail")
const fileUpload = require("express-fileupload")
app.use(cookieParser("secret"));
app.use(bodyParser.json({limit: '2gb', extended: true}))
app.use(bodyParser.urlencoded({limit: '2gb', extended: true}))
app.use(fileUpload({
    limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB for now
    useTempFiles : true,
    tempFileDir : 'data/tmp'
}));
require('dotenv').config()


const w = require("./modules/json.js")
const auth = require("./modules/authenticator.js")
const pusher = require("./modules/pusher.js")
const handler = require("./modules/fileHandler.js")

const dir = __dirname + "/static/"


class Device {
    constructor() {
        this.schema = 1
        this.id = uuid.v4()
        this.name = `Device ${this.id.substring(0,5)}`
        this.devgroup = null
        this.slideshows = []
        this.port = 3030
        this.authentication = ""
        this.ip = ""
        this.manifest = 0
    }
}

class Slideshow {
    constructor() {
        this.schema = 1
        this.id = uuid.v4()
        this.name = `Slideshow ${this.id.substring(0,5)}`
        this.expire = 0
        this.slides = {}
        this.order = []
    }
}

class Slide {
    constructor(name, hash, extension, type, ext1) {
        this.schema = 1
        this.id = uuid.v4()
        this.name = name || `Slide ${this.id.substring(0,5)}`
        this.expire = 0
        this.extension = extension
        this.type = type
        switch (type) {
            case "image":
                this.screentime = process.env.DEFAULT_TIME || 10
                this.hash = hash
                break;
            case "video":
                this.hash = hash
                this.volume = ext1 || process.env.DEFAULT_VOLUME || 0
                break;
            case "youtube":
                this.url = hash
                this.volume = ext1 || process.env.DEFAULT_VOLUME || 0
            case "live": // livestreams will not be implemented for a while, since more planning is needed around timing/ending
                this.url = hash
                this.volume = ext1 || process.env.DEFAULT_VOLUME || 0
                break;
        }
    }
}

class Group {
    constructor() {
        this.schema = 1
        this.id = uuid.v4()
        this.name = `Group ${this.id.substring(0,5)}`
        this.devices = []
        this.slideshows = []
    }
}


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
        res.send(await w.getList('data/devices', ["id", "name"]));
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/slideshows", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        res.send(await w.getList('data/slideshows', ["id", "name"]));
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/groups", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        res.send(await w.getList('data/groups', ["id", "name"]))
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/device/:device", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        w.readJSON(`data/devices/${req.params.device}.json`)
            .then((data) => res.send(data))
            .catch((err) => res.send({"error": true}))
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/slideshow/:slideshow", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        w.readJSON(`data/slideshows/${req.params.slideshow}.json`)
            .then((data) => res.send(data))
            .catch((err) => res.send({"error": true}))
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/group/:group", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        w.readJSON(`data/groups/${req.params.group}.json`)
            .then(async (data) => {
                data.devices = await w.getList('data/devices', ["id", "name", "devgroup"])
                res.send(data);
            })
            .catch((err) => res.send({"error": true}))
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/slide/thumbnail/:slide", async (req, res) => { // needs new file uploader
    if (await auth.isVerified(req.signedCookies)) {
        let slideSplit = req.params.slide.split(".")
        if (slideSplit.length == 2) {
            slideSplit[0] += "_THUMB"
            slideSplit = slideSplit.join(".")
            res.sendFile(__dirname + `/data/slides/${slideSplit.substring(0, 2)}/${slideSplit}`)
        } else res.send({"error": true})
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/device/new", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let device = new Device()
        await w.writeJSON(`data/devices/${device.id}.json`, device)
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/slideshow/new", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let slideshow = new Slideshow()
        await w.writeJSON(`data/slideshows/${slideshow.id}.json`, slideshow)
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/group/new", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let group = new Group()
        await w.writeJSON(`data/groups/${group.id}.json`, group)
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/slide/new", (async (req, res) => { // this does NOT work with the current front end!
    if (await auth.isVerified(req.signedCookies)) {
        let name = req.files.file.name.split(".")
        let extension = name.pop()
        name = name.join(".")
        let fType = req.files.file.mimetype.split("/")[0]
        let slide, info, thumbnail
        switch (fType) {
            case "image":
                slide = new Slide(name, req.files.file.md5, extension, "image")
                info = await handler.save(req.files.file, req.files.file.md5, extension)
                thumbnail = await imageThumbnail(info.path, {width: 250});
                let thumbName = info.name.split(".")
                thumbName[0] += "_THUMB"
                thumbName = thumbName.join(".")
                await fs.promises.writeFile(`data/slides/${info.name.substring(0,2)}/${thumbName}`, thumbnail)
                break;
            case "video":
                slide = new Slide(name, req.files.file.md5, extension, "video")
                info = await handler.save(req.files.file, req.files.file.md5, extension)
                // need to generate thumbnail for video!
        }

        let input = await w.readJSON(`data/slideshows/${req.body.member}.json`)
        input.slides[slide.id] = slide
        input.order.push(slide.id)
        await w.writeJSON(`data/slideshows/${req.body.member}.json`, input)
        pusher.updateDevicesWithSlideshow(req.body.member);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
}));

function array_move(arr, old_index, new_index) { // https://stackoverflow.com/questions/5306680/move-an-array-element-from-one-array-position-to-another
    if (new_index >= arr.length) arr.splice(arr.length, 0, arr.splice(old_index, 1)[0]);
    else arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return arr; // for testing
};

app.post("/api/slide/move", (async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let input = await w.readJSON(`data/slideshows/${req.body.slideshow}.json`)
        console.log(input.order)
        input.order = array_move(input.order, req.body.originalPos, parseInt(req.body.newPos))
        console.log(input.order)
        await w.writeJSON(`data/slideshows/${req.body.slideshow}.json`, input)
        pusher.updateDevicesWithSlideshow(req.body.slideshow);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
}));

app.post("/api/device/edit", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let device = await w.readJSON(`data/devices/${req.body.id}.json`)
        if (device.devgroup) req.body.slideshows = device.slideshows // devices in a group cannot deviate from group
        if (req.body.name) device.name = req.body.name
        if (req.body.ip) device.ip = req.body.ip
        if (req.body.slideshows) device.slideshows = req.body.slideshows
        if (req.body.authentication) device.authentication = req.body.authentication
        if (req.body.port) device.port = req.body.port
        await w.writeJSON(`data/devices/${req.body.id}.json`, device)
        pusher.pushManifest(req.body.id);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/slide/edit", async (req, res) => { // this does NOT work with the current front end!
    if (await auth.isVerified(req.signedCookies)) {
        let input = await w.readJSON(`data/slideshows/${req.body.member}.json`)
        if (req.body.name) input.slides[req.body.id].name = req.body.name
        if (req.body.volume && input.slides[req.body.id].volume != null) input.slides[req.body.id].volume = req.body.volume
        if (req.body.screentime) input.slides[req.body.id].screentime = req.body.screentime
        if (req.body.expire) input.slides[req.body.id].expire = req.body.expire
        await w.writeJSON(`data/slideshows/${req.body.member}.json`, input)
        pusher.updateDevicesWithSlideshow(req.body.member)
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/group/edit", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let input = await w.readJSON(`data/groups/${req.body.id}.json`)
        if (req.body.name) input.name = req.body.name
        if (req.body.slideshows) input.slideshows = req.body.slideshows
        if (req.body.devices) input.devices = req.body.devices
        await w.writeJSON(`data/groups/${req.body.id}.json`, input)
        for (let device of await w.getList('data/devices', ["id", "devgroup"])) {
            if (device.devgroup == req.body.id && !input.devices.includes(device.id)) await w.updateValue(`data/devices/${device.id}.json`, "devgroup", null)
            if (device.devgroup != req.body.id && input.devices.includes(device.id))  await w.updateValue(`data/devices/${device.id}.json`, "devgroup", req.body.id)
            if (input.devices.includes(device.id)) await w.updateValue(`data/devices/${device.id}.json`, "slideshows", req.body.slideshows)
            pusher.pushManifest(device.id);
        }
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/slideshow/edit", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let input = await w.readJSON(`data/slideshows/${req.body.id}.json`)
        if (req.body.name) input.name = req.body.name
        if (req.body.expire) input.expire = req.body.expire
        await w.writeJSON(`data/slideshows/${req.body.id}.json`, input)
        pusher.updateDevicesWithSlideshow(req.body.id)
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.get("/api/slide/get/:slide", async (req, res) => {
    if (true) { // device authentication
        if (req.params.slide.split(".").length == 2) {
            res.sendFile(`${__dirname}/data/slides/${req.params.slide.substring(0, 2)}/${req.params.slide}`)
        } else res.send({"error": true})
    }
});

app.get("/api/device/refresh/:id", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        pusher.pushManifest(req.params.id)
        res.send({"res": 0})
    }
});

app.get("/api/device/test/:id", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let data = await w.readJSON(`data/devices/${req.params.id}.json`)
        pusher.get(`http://${data.ip}:${data.port}/status?auth=${data.authentication}`).then(async (resp) => {
            if (resp.error == "auth") await w.updateValue(`data/devices/${req.params.id}.json`, "lastSuccess", -1)
            else await w.updateValue(`data/devices/${req.params.id}.json`, "lastSuccess", new Date())
            res.send({devError: false, response:resp})
          }).catch(async (error) => {
            res.send({devError: true, response: data.lastSuccess})
            await w.updateValue(`data/devices/${req.params.id}.json`, "lastSuccess", new Date()*-1)
          });
    }
});

app.post("/api/device/reboot", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let data = await w.readJSON(`data/devices/${req.body.id}.json`)
        try {
            let resp = await pusher.post(`http://${data.ip}:${data.port}/reboot`, {"auth": data.authentication});
            res.send({error: false})
        } catch(e)  {
            console.log(e)
            res.send({error: true})
        }
    }
});

app.get("/api/device/getnonce/:id", async (req, res) => {
    let data = await w.readJSON(`data/devices/${req.params.id}.json`)
    if (data.manifest != null) {
        res.send({"nonce": data.manifest})
    } else {
        res.send({"nonce": null})
    }
});

app.post("/api/slide/delete", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let input = await w.readJSON(`data/slideshows/${req.body.member}.json`)
        delete input.slides[req.body.id]
        input.order = removeFromArray(input.order, req.body.id)
        await w.writeJSON(`data/slideshows/${req.body.member}.json`, input)

        // file cleanup

        pusher.updateDevicesWithSlideshow(req.body.member);
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

app.post("/api/slideshow/delete", async (req, res) => { // needs to also remove from groups!
    if (await auth.isVerified(req.signedCookies)) {
        let input = await w.readJSON(`data/slideshows/${req.body.id}.json`)
        await w.deleteJSON(`data/slideshows/${req.body.id}.json`)
        let devices = await w.getList('data/devices', ["id", "slideshows", "devgroup"])
        let updateGroups = []
        let updateDevices = []
        for (let device of devices) {
            if (device.slideshows.includes(req.body.id)) {
                await w.updateValue(`data/devices/${device.id}.json`, "slideshows", removeFromArray(device.slideshows, req.body.id))
                updateDevices.push(device.id)
            }
            if (device.devgroup != null && !updateGroups.includes(device.devgroup)) updateGroups.push(device.devgroup)
        }
        for (let group of updateGroups) {
            let input = await w.readJSON(`data/groups/${group}.json`)
            input.slideshows = removeFromArray(input.slideshows, req.body.id);
            await w.writeJSON(`data/groups/${group}.json`, input)
        }
        for (let device of updateDevices) pusher.pushManifest(device)
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/device/delete", async (req, res) => { // remove from device list on group
    if (await auth.isVerified(req.signedCookies)) {
        let input = await w.readJSON(`data/devices/${req.body.id}.json`)
        await w.deleteJSON(`data/devices/${req.body.id}.json`)
        if (input.devgroup) {
            let input2 = await w.readJSON(`data/groups/${input.devgroup}.json`)
            input2.devices = removeFromArray(input2.devices, req.body.id);
            await w.writeJSON(`data/groups/${input.devgroup}.json`, input2)
        }
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});

app.post("/api/group/delete", async (req, res) => {
    if (await auth.isVerified(req.signedCookies)) {
        let input = await w.readJSON(`data/groups/${req.body.id}.json`)
        await w.deleteJSON(`data/groups/${req.body.id}.json`)
        for (let device of input.devices) await w.updateValue(`data/devices/${device}.json`, "devgroup", null);
        res.send({"error": false});
    } else {
        res.send({"error": "NotVerified"});
    }
});


let port = process.env.PI_PORT || 3000
if (process.env.TEST_ENV == 1) port = null
let server = app.listen(port, async () => {
    await w.initialize()
    if (process.env.TEST_ENV != 1)console.log(`PieBoard Server Host listening on port ${port}!`)
})

function stop() {
    server.close()
}

module.exports = app
module.exports.close = stop