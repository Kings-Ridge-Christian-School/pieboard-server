import * as store from "./../../store.mjs"
import log from "../../log.mjs";

export default async function main(req) {
    let slideshow = await new Promise((resolve) => {
        store.readJSON(`./data/slideshows/${req.params.slideshow}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (!slideshow) return {"code": 400, "data": "SlideshowNoExistError"}
    if (!slideshow.slides[req.params.slide]) return {"code": 400, "data": "SlideNoExistError"}

    delete slideshow.slides[req.params.slide]

    slideshow.order = slideshow.order.filter((x) => x != req.params.slide)

    await store.writeJSON(`./data/slideshows/${req.params.slideshow}.json`, slideshow);
    log("DEL", `Deleted slide ${req.params.slide} from ${req.params.slideshow}`)

    return {"code": 200, "data": slideshow}
}