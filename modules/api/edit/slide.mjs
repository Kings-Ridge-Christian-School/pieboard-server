import * as store from "./../../store.mjs"
import log from "../../log.mjs";

function validUrl(input) {
    try {
        let url = new URL(input);
    } catch (_) {
        return false
    }
    return true
}

export default async function main(req) {
    let slideshow = await new Promise((resolve) => {
        store.readJSON(`./data/slideshows/${req.params.slideshow}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (!slideshow) return {"code": 400, "data": "SlideshowNoExistError"}
    if (!slideshow.slides[req.params.slide]) return {"code": 400, "data": "SlideNoExistError"}

    let change = req.body.change

    let slide = slideshow.slides[req.params.slide]

    switch (change) {
        case "expire":
            if (isNaN(req.body.value)) return {"code": 400, "data": "DataFormatError"}
            slide.expire = req.body.value
            break;
        case "name":
            slide.name = req.body.value
            break;
        case "screentime":
            if (isNaN(req.body.value)) return {"code": 400, "data": "DataFormatError"}
            slide.screentime = req.body.value
            break;
        case "volume":
            if (!["youtube", "live", "video"].includes(slide.type)) return {"code": 400, "data": "SideNotCorrectTypeError"}
            if (isNaN(req.body.value)) return {"code": 400, "data": "DataFormatError"}
            slide.volume = req.body.value
            break;
        case "url":
            if (!["youtube", "live"].includes(slide.type)) return {"code": 400, "data": "SideNotCorrectTypeError"}
            if (!validUrl(req.body.change)) return {"code": 400, "data": "InvalidUrlError"}
            slide.url = req.body.change
            break;
    }

    log("EDIT", `Edited ${req.body.change} in slide ${req.params.id} in ${req.params.slideshow}`)
    await store.writeJSON(`./data/slideshows/${req.params.slideshow}.json`, slideshow);

    return {"code": 200, "data": slideshow}
}