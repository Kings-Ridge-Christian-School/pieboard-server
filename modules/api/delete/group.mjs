import * as store from "./../../store.mjs"
import log from "../../log.mjs";

export default async function main(req) {
    let server = await new Promise((resolve) => {
        store.readJSON(`./data/server.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    let slideshow = await new Promise((resolve) => {
        store.readJSON(`./data/groups/${req.params.id}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (req.params.id == server.default_group) return {"code": 400, "data": "GroupCannotDeleteDefault"}

    if (!slideshow) return {"code": 400, "data": "GroupNoExistError"}

    let devices = await store.listJSON("./data/devices")

    for (let device of devices) {
        let data = await store.readJSON(`./data/devices/${device}`)
        if (data.group == req.params.id) {
            log("DEL", `Device ${data.id} uses group ${req.params.id}! Sending to default`, 2)
            data.group = server.default_group
            await store.writeJSON(`./data/devices/${device}`, data)
        }
    }

    await store.deleteJSON(`./data/groups/${req.params.id}.json`)

    log("DEL", `Deleted slideshow ${req.params.id}`)

    return {"code": 200, "data": "OK"}
}