import * as pusher from "./../pusher.mjs"

export default async function main(req) {
    let res = await pusher.updateDevices()
    return {"code": 200, "data": res}
}