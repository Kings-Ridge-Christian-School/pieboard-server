import * as crypto from './crypto.mjs'
import fetch from 'node-fetch'
import * as store from "./store.mjs";
import log from './log.mjs'
import {v4 as uuid} from "uuid";

class Manifest {
    constructor(slides) {
        this.schema = 2
        this.id = uuid()
        this.created = new Date()
        this.slides = slides
    }
}

async function fetchDeviceData(id) {
    return await new Promise((resolve, reject) => {
        store.readJSON(`./data/devices/${id}.json`).then((res) => {
            resolve(res)
        }).catch((err) => reject(err))
    })
}

export async function sendDeviceCommand(ip, key, message, timeout) {
    log("PUSH", `Device command to ${ip}`, 0)
    let data = await new Promise(async(resolve) => {
        fetch(`http://${ip}:44172/client`, {
            "method": "post",
            headers: {'Content-Type': 'application/json'},
            timeout: timeout || 5000,
            body: JSON.stringify({
                "msg": await crypto.encrypt(JSON.stringify(message), key)
            })
        }).then((res) => res.text())
            .then(async body => await crypto.decrypt(body, key))
            .then(out => resolve(out))
            .catch((err) => {
                console.log(err);
                log("PUSH", `Device command to ${ip} failed`, 2);
                resolve()
            })
    });
    return data
}

export async function readDeviceState(id) {
    let data = await fetchDeviceData(id)
    if (data.state != 2) {
        log("PUSH", `Device ${id} is not in a ready state!`, 2)
        return
    }
    let state = await sendDeviceCommand(data.ip, data.key, {"act": "get_status"}, 10000)

    if (!state) log("PUSH", `Device ${id} is not connected properly!`, 2)

    return state
}

async function writeDeviceState(id, manifest) {
    let data = await fetchDeviceData(id)
    if (data.state != 2) {
        log("PUSH", `Device ${id} is not in a ready state!`, 2)
        return
    }
    let reply = await sendDeviceCommand(data.ip, data.key,
        {"act": "put_manifest", "data": manifest})

    data.manifest = manifest

    if (!reply) {
        log("PUSH", `Device ${id} is not connected properly!`, 2)
        await store.writeJSON(`./data/devices/${id}.json`, data);
        return
    }

    data.live_id = manifest.id

    log("PUSH", `Device ${id} was successfully updated`)
    await store.writeJSON(`./data/devices/${id}.json`, data);

    return reply
}

async function generateManifest(group) {
    let data = await store.readJSON(`./data/groups/${group}.json`)

    let slides = []

    for (let show of data.slideshows) {
        let showdata = await store.readJSON(`./data/slideshows/${show}.json`)
        if (showdata.isRandom) {

            function shuffle(array) { // https://javascript.info/array-methods#shuffle-an-array
                for (let i = array.length - 1; i > 0; i--) {
                    let j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
            }

            shuffle(showdata.order)
        }

        for (let slide of showdata.order) {
            let slidedata = showdata.slides[slide]
            if (slidedata.expire === 0 && showdata.expire !== 0) slidedata.expire = showdata.expire
            slides.push(slidedata)
        }
    }
    log("PUSH", `Manifest generated for group ${group}`, 0)
    return new Manifest(slides);
}

export async function updateDevices() {
    let list = await store.listJSON(`./data/devices`)
    log("PUSH", `Device update triggered for ${list.length} devices`)
    list = list.map(x => x.split(".")[0])

    let manifests = {}

    for (let device of list) {
        let data = await fetchDeviceData(device)
        let manifest = await generateManifest(data.group)
        manifests[device] = manifest
    }

    let pool = []

    for (let device of list) pool.push(writeDeviceState(device, manifests[device]))

    let res = await Promise.all(pool)

    let final = {}

    for (let device in list) { // tie response back to ID
        final[list[device]] = res[device]
    }

    return final
}