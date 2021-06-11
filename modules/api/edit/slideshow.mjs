import * as store from "./../../store.mjs"
import log from "../../log.mjs";

export default async function main(req) {


    let data = await new Promise((resolve) => {
        store.readJSON(`./data/slideshows/${req.params.id}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (!data) return {"code": 400, "data": "SlideshowNoExistError"}

    let change = req.body.change
    switch (change) {
        case "expire":
            if (isNaN(req.body.value)) return {"code": 400, "data": "DataFormatError"}
            data.expire = req.body.value
            break;
        case "name":
            data.name = req.body.value
            break;
        case "random":
            if (req.body.value === true || req.body.value === false)
                data.isRandom = req.body.value
            else return {"code": 400, "data": "DataFormatError"}
            break;
        case "order":
            for (let slide of req.body.value) {
                if (!data.slides[slide])  return {"code": 400, "data": "SlideNoExistError"}
            }
            data.order = req.body.value
            break;
    }

    log("EDIT", `Edited ${req.body.change} in slideshow ${req.params.id}`)
    await store.writeJSON(`./data/slideshows/${req.params.id}.json`, data)

    return {"code": 200, "data": data}
}