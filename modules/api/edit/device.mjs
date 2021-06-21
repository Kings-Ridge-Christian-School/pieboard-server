import * as store from "./../../store.mjs"
import log from "./../../log.mjs"
import * as pusher from "./../../pusher.mjs"
import fetch from "node-fetch";
import * as crypto from "../../crypto.mjs";
import dotenv from 'dotenv'
dotenv.config()

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
        case "state":
            switch (data.state) {
                case 0:
                case 1:
                    if (!data.ip) return {"code": 400, "data": "DeviceNotConfiguredError"}
                    let server = await new Promise((resolve) => {
                        store.readJSON(`./data/server.json`).then((res) => {
                            resolve(res)
                        }).catch((err) => resolve())
                    })
                    let dataOut = await new Promise(async(resolve) => {
                        fetch(`http://${data.ip}:44172/setup`, {
                            "method": "post",
                            headers: {'Content-Type': 'application/json'},
                            timeout: 5000,
                            body: JSON.stringify({
                                "key": server.keys.public,
                                "id": req.body.value,
                                "device_id": data.id,
                                "server_address": process.env.SERVER_ADDRESS
                            })
                        }).then((res) => res.text())
                            .then(body => resolve(body))
                            .catch((err) => {
                                resolve()
                            })
                    });
                    if (dataOut) {
                        if (dataOut == "no")  return {"code": 400, "data": "DeviceAlreadyClaimedError"}
                        else if (dataOut == "auth") return {"code": 400, "data": "DeviceIncorrectIDError"}
                        else {
                            data.key = dataOut
                            data.state = 1
                            log("EDIT", `Device ${req.params.id} has been connected to`)
                            await store.writeJSON(`./data/devices/${req.params.id}.json`, data)
                            return {"code": 200, "data": data}
                        }
                    } else return {"code": 400, "data": "DeviceNoConnectError"}
                    break
                default:
                    return {"code": 400, "data": "DeviceAlreadyConfiguredError"}
                    break
            }
            break;
        case "update":
            return {"code": 200, "data": await pusher.sendDeviceCommand(data.ip, data.key, {"act": "run_update"})}
            break;
        case "reboot":
            return {"code": 200, "data": await pusher.sendDeviceCommand(data.ip, data.key, {"act": "run_reboot"})}
            break;
    }

    log("EDIT", `Edited ${req.body.change} in device ${req.params.id}`)
    await store.writeJSON(`./data/devices/${req.params.id}.json`, data)

    return {"code": 200, "data": data}
}