import * as crypto from "./../crypto.mjs"
import * as store from "./../store.mjs"
import log from "./../log.mjs"
export default async function main(req) {
    let device = await store.readJSON(`./data/devices/${req.body.id}.json`)
    if (!device) return {"data": "DeviceNoExistError"}

    let msg = await crypto.decrypt(req.body.msg, device.key)

    msg = JSON.parse(msg)

    switch (msg.act) {
        case "register":
            device.state = 2
            log("CLIENT", `${req.body.id} registered!`)
            await store.writeJSON(`./data/devices/${req.body.id}.json`, device)
            return {"code": 200, "data": await crypto.encrypt("ok", device.key)}
            break;
    }
}