import * as store from "./../../store.mjs"
import * as pusher from './../../pusher.mjs'
export default async function main(req) {
    let device = await new Promise((resolve) => {
        store.readJSON(`./data/devices/${req.params.device}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (!device) return {"code": 400, "data": "DeviceNoExistError"}

    return {"code": 200, "data": await pusher.readDeviceState(req.params.device)}
}