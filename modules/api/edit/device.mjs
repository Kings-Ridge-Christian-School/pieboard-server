import * as store from "./../../store.mjs"
import log from "./../../log.mjs"

export default async function main(req) {


    let data = await new Promise((resolve) => {
        store.readJSON(`./data/devices/${req.params.id}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (!data) return {"code": 400, "data": "NoExistError"}

    let change = req.body.change
    switch (change) {
        case "port":
            if (isNaN(req.body.value)) return {"code": 400, "data": "DataFormatError"}
            data.expire = req.body.value
            break;
        case "name":
            data.name = req.body.value
            break;
        case "ip":
            data.ip = req.body.value
            break;
        case "group":
            let group = await new Promise((resolve) => {
                store.readJSON(`./data/groups/${req.body.value}.json`).then((res) => {
                    resolve(true)
                }).catch((err) => resolve(false))
            })
            if (group) data.group = req.body.value
            else return {"code": 400, "data": "GroupNoExistError"}
            break;
    }

    log("EDIT", `Edited ${req.body.change} in device ${req.params.id}`)
    await store.writeJSON(`./data/devices/${req.params.id}.json`, data)

    return {"code": 200, "data": data}
}