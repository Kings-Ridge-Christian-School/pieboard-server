import * as store from "./../../store.mjs"
import log from "../../log.mjs";

export default async function main(req) {
    let slideshow = await new Promise((resolve) => {
        store.readJSON(`./data/devices/${req.params.id}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (!slideshow) return {"code": 400, "data": "DeviceNoExistError"}


    await store.deleteJSON(`./data/devices/${req.params.id}.json`)
    log("DEL", `Deleted device ${req.params.id}`)

    return {"code": 200, "data": "OK"}
}