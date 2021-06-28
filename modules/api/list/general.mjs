import * as store from "./../../store.mjs"

export default async function main(req) {

    let types = ["device", "slideshow", "group"]

    if (!types.includes(req.params.type)) return {"code": 404, "data": "UnknownTypeError"}

    let list = await store.listJSON(`./data/${req.params.type}s`)

    list = list.map(x => x.split(".")[0])

    let finalList = []

    for (let item of list) {
        let data = await store.readJSON(`./data/${req.params.type}s/${item}.json`)
        finalList.push({
            "id": item,
            "name": data.name
        })
    }

    return {"code": 200, "data": finalList}
}