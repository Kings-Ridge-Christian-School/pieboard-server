import * as store from "./../../store.mjs"
import log from "../../log.mjs";

export default async function main(req) {
    let slideshow = await new Promise((resolve) => {
        store.readJSON(`./data/slideshows/${req.params.id}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (!slideshow) return {"code": 400, "data": "SlideshowNoExistError"}

    let groups = await store.listJSON("./data/groups")

    for (let group of groups) {
        let data = await store.readJSON(`./data/groups/${group}`)
        data.slideshows = data.slideshows.filter((x) => x != req.params.id)
        await store.writeJSON(`./data/groups/${group}`, data)
    }

    await store.deleteJSON(`./data/slideshows/${req.params.id}.json`)

    log("DEL", `Deleted slideshow ${req.params.id}`)
    return {"code": 200, "data": "OK"}
}