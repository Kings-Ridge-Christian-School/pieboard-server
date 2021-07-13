import * as store from "./../../store.mjs"
import * as pusher from './../../pusher.mjs'
export default async function main(req) {
    let device = await new Promise((resolve) => {
        store.readJSON(`./data/devices/${req.params.device}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (!device) return {"code": 400, "data": "DeviceNoExistError"}

    if (device.state != 2) return {"code": 400, "data": "DeviceNotConfiguredError"}

    return {"code": 200, "data": await pusher.sendDeviceCommand(device.ip, device.key, {"act": "get_manifest"})}
}