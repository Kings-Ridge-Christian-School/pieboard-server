const fetch = require('node-fetch')
const sql = require('./sqlite')
const md5 = require('md5')
require('dotenv').config()

function get(url) {
    return new Promise(async (resolve) => {
        if (process.env.TEST_ENV == 1) resolve({})
        else {
            let response = await fetch(url);
            resolve(response.json());
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
    for (slide in slides) {
        manifest.data.push({
            "id": slides[slide].id,
            "hash": slides[slide].hash,
            "screentime": slides[slide].screentime,
            "expiration": slideshows[slides[slide].member][0].expire,
        });
    }
    return(manifest);
}

async function generateManifestFromID(id) {
    let device = await sql.query("SELECT slideshows, authentication FROM devices WHERE id = ?", [id])
    if (device.length > 0) {
        slideshows = JSON.parse(device[0].slideshows)
        let slideshowList = {}
        let slides = []
        let slideList = [];
        for (slideshow in slideshows) {
            slideshowList[slideshows[slideshow]] = await sql.query("SELECT expire FROM slideshows WHERE id = ?", [slideshows[slideshow]]);
            slideList = await sql.query("SELECT id, screentime, data, member, hash FROM slides WHERE member = ? ORDER BY position ASC", [slideshows[slideshow]])
            for (slide in slideList) {
                slides.push(slideList[slide])
            }
        }
        return generateManifestFromData(slides, slideshowList, id, device[0].authentication);
    } else {
        return false
    }
}

async function pushManifest(id) {
    let data = await sql.query("SELECT ip, port FROM devices WHERE id = ?", [id])
    if (data.length > 0) {
        let manifest = await generateManifestFromID(id)
        let nonce = md5(Math.random())
        manifest.nonce = nonce
        await sql.query("UPDATE devices SET manifest = ? WHERE id = ?", [nonce, id]);
        try {
             let req = await post(`http://${data[0].ip}:${data[0].port}/manifest`, manifest);
             if (req.error) {
                 console.log("Couldn't push due to password!")
                await sql.query("UPDATE devices SET lastSuccess = ? WHERE id = ?", [-1, id])
                return false
             } else {
                if (process.env.TEST_ENV != 1) console.log("Pushed updated manifest to " + id);
                await sql.query("UPDATE devices SET lastSuccess = ? WHERE id = ?", [new Date(), id])
                return true
             }
        } catch(e)  {
            console.log(`Unable to push to device ${id}!`);
            await sql.query("UPDATE devices SET lastSuccess = ? WHERE id = ?", [new Date()*-1, id])
            return false
        }
    } else {
        return false
    }
}

async function updateDevicesWithSlideshow(slideshow) {
    let devices = await sql.query("SELECT id, slideshows FROM devices")
    for (device in devices) {
        if (JSON.parse(devices[device].slideshows).includes(slideshow + "")) {
            pushManifest(devices[device].id)
        }
    }
}

setInterval(async () => {
    let devices = await sql.query("SELECT id, lastSuccess FROM devices");
    for (let device of devices) {
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