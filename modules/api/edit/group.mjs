import * as store from "./../../store.mjs"
import log from "../../log.mjs";

export default async function main(req) {


    let data = await new Promise((resolve) => {
        store.readJSON(`./data/groups/${req.params.id}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (!data) return {"code": 400, "data": "GroupNoExistError"}

    let change = req.body.change
    switch (change) {
        case "name":
            data.name = req.body.value
            break;
        case "slideshows":
            for (let show of req.body.value) {
                let slideshow = await new Promise((resolve) => {
                    store.readJSON(`./data/slideshows/${show}.json`).then((res) => {
                        resolve(true)
                    }).catch((err) => resolve(false))
                })
                if (!slideshow) return {"code": 400, "data": "SlideshowNoExistError"}
            }
            data.slideshows = req.body.value
    }

    log("EDIT", `Edited ${req.body.change} in group ${req.params.id}`)
    await store.writeJSON(`./data/groups/${req.params.id}.json`, data)

    return {"code": 200, "data": data}
}