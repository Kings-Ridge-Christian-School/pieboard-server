import * as store from "./../../store.mjs"

export default async function main(req) {

    let types = ["device", "slideshow", "group"]

    if (!types.includes(req.params.type)) return {"code": 404, "data": "UnknownTypeError"}

    let data = await new Promise((resolve) => {
        store.readJSON(`./data/${req.params.type}s/${req.params.id}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (!data) return {"code": 200, "data": "NoExistError"}
    return {"code": 200, "data": data}
}