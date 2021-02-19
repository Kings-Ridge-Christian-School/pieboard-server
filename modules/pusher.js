const fetch = require('node-fetch')
const w = require('./json')
const uuid = require("uuid")
require('dotenv').config()

function get(url) {
    return new Promise(async (resolve, reject) => {
        if (process.env.TEST_ENV == 1) resolve({})
        else {
            fetch(url).then((res) => {
                resolve(res.json())
            }).catch((err) => {
                reject(err)
            });
        }
    });
}
function post(url, data) {
    return new Promise(async (resolve, reject) => {
        try {
            if (process.env.TEST_ENV == 1) resolve({})
            else {
                let response = await fetch(url, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(data)
                });
                resolve(response.json());
            }
        } catch(e) {
            reject(e)
        }
    });
}

function generateManifestFromData(slides, slideshows, id, auth) {
    let manifest = {
        "time": new Date(),
        "auth": auth,
        "address": process.env.IP,
        "port": process.env.PROXY_PORT || process.env.PI_PORT || 3000,
        "id": id,
        "data": []
    }
    for (let slide in slides) manifest.data.push(slide);
    return(manifest);
}

async function generateManifestFromID(id) {
    let device = await w.readJSON(`data/devices/${id}.json`)
    if (device) {
        let slideshowList = {}
        let slides = []
        let slideList = [];
        for (let slideshow of device.slideshows) {
            slideshowList[slideshow] = await w.readJSON(`data/slideshows/${slideshow}.json`)
            for (const [key, value] of Object.entries(slideshowList[slideshow].slides)) {
                slides.push(value)
            }
        }
        return generateManifestFromData(slides, slideshowList, id, device.authentication);
    } else {
        return false
    }
}

async function pushManifest(id) {
    let data = await w.readJSON(`data/devices/${id}.json`)
    if (data) {
        let manifest = await generateManifestFromID(id)
        let nonce = uuid.v4()
        manifest.nonce = nonce
        await w.updateValue(`data/devices/${id}.json`, "manifest", nonce)
        try {
             let req = await post(`http://${data[0].ip}:${data[0].port}/manifest`, manifest);
             if (req.error) {
                 console.log("Couldn't push due to password!")
                 await w.updateValue(`data/devices/${id}.json`, "lastSuccess", -1)
                return false
             } else {
                if (process.env.TEST_ENV != 1) console.log("Pushed updated manifest to " + id);
                 await w.updateValue(`data/devices/${id}.json`, "lastSuccess", new Date())
                return true
             }
        } catch(e)  {
            console.log(`Unable to push to device ${id}!`);
            await w.updateValue(`data/devices/${id}.json`, "lastSuccess", new Date()*-1)
            return false
        }
    } else {
        return false
    }
}

async function updateDevicesWithSlideshow(slideshow) {
    let devices = await w.getList('data/devices', ["id", "slideshows"])
    for (let device of devices) {
        if (device.slideshows.includes(slideshow)) {
            pushManifest(device.id)
        }
    }
}

setInterval(async () => {
    let devices = await w.listJSON("data/devices")
    let devs = []
    for (let device of devices) {
        let deviceInfo = await w.readJSON(`data/devices/${device}`);
        devs.push(deviceInfo)
    }
    for (let device of devs) {
        if (device.lastSuccess == 0) {
            console.log("Attempting to push new manifest to offline device")
            pushManifest(device.id)
        }
    }
}, 60*1000*3) // every 3 minutes or so

exports.generateManifestFromData = generateManifestFromData
exports.generateManifestFromID = generateManifestFromID
exports.pushManifest = pushManifest
exports.updateDevicesWithSlideshow = updateDevicesWithSlideshow
exports.get = get
exports.post = post