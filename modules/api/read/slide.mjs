import * as store from "./../../store.mjs"

export default async function main(req) {
    let slideshow = await new Promise((resolve) => {
        store.readJSON(`./data/slideshows/${req.params.slideshow}.json`).then((res) => {
            resolve(res)
        }).catch((err) => resolve())
    })

    if (!slideshow) return {"code": 200, "data": "SlideshowNoExistError"}
    if (!slideshow.slides[req.params.slide]) return {"code": 200, "data": "SlideNoExistError"}

    let slide = slideshow.slides[req.params.slide]

    switch (slide.type) {
        case "image":
        case "video":
            return {"code": 200, "path": `data/slides/${slide.hash.substring(0,2)}/${slide.hash}.${slide.extension}`}
            break;
        default:
            return {"code": 200, "data": slide}
    }
}