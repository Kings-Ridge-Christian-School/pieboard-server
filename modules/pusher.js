const fetch = require('node-fetch')
const sql = require('./sqlite')
const md5 = require('md5')
require('dotenv').config()

function get(url) {
    return new Promise(async (resolve) => {
        let response = await fetch(url);
        resolve(response.json());
    });
}
function post(url, data) {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await fetch(url, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(data)
            });
            resolve(response.json());
        } catch(e) {
            reject(e)
        }
    });
}

function generateManifestFromData(slides, groups, id, auth) {
    let manifest = {
        "time": new Date(),
        "auth": auth,
        "address": process.env.IP,
        "id": id,
        "data": []
    }
    for (slide in slides) {
        manifest.data.push({
            "id": slides[slide].id,
            "hash": slides[slide].hash,
            "screentime": slides[slide].screentime,
            "expiration": groups[slides[slide].member][0].expire,
        });
    }
    return(manifest);
}

async function generateManifestFromID(id) {
    let device = await sql.query("SELECT groups, authentication FROM devices WHERE id = ?", [id])
    if (device.length > 0) {
        groups = JSON.parse(device[0].groups)
        let groupList = {}
        let slides = []
        for (group in groups) {
            groupList[groups[group]] = await sql.query("SELECT expire FROM groups WHERE id = ?", [groups[group]]);
            let slideGroup = await sql.query("SELECT id, screentime, data, member, hash FROM slides WHERE member = ?", [groups[group]])
            for (slide in slideGroup) {
                slides.push(slideGroup[slide])
            }
        }
        return generateManifestFromData(slides, groupList, id, device[0].authentication);
    } else {
        return false
    }
}

async function pushManifest(id) {
    let data = await sql.query("SELECT ip FROM devices WHERE id = ?", [id])
    if (data.length > 0) {
        let manifest = await generateManifestFromID(id)
        let nonce = md5(Math.random())
        manifest.nonce = nonce
        await sql.query("UPDATE devices SET manifest = ? WHERE id = ?", [nonce, id]);
        try {
             await post("http://" + data[0].ip + ":3030/manifest", manifest);
             console.log("Pushed updated manifest to " + id);
             return true
        } catch(e)  {
            console.log(id + " is offline!");
            return false
        }
    } else {
        return false
    }
}

async function updateDevicesInGroup(group) {
    let devices = await sql.query("SELECT id, groups FROM devices")
    for (device in devices) {
        if (JSON.parse(devices[device].groups).includes(group + "")) {
            pushManifest(devices[device].id)
        }
    }
}

exports.generateManifestFromData = generateManifestFromData
exports.generateManifestFromID = generateManifestFromID
exports.pushManifest = pushManifest
exports.updateDevicesInGroup = updateDevicesInGroup