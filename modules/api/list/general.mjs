import * as store from "./../../store.mjs"

export default async function main(req) {

    let types = ["device", "slideshow", "group"]

    if (!types.includes(req.params.type)) return {"code": 404, "data": "UnknownTypeError"}

    let list = await store.listJSON(`./data/${req.params.type}s`)

    list = list.map(x => x.split(".")[0])

    return {"code": 200, "data": list}
}