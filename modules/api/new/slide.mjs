import * as store from "./../../store.mjs"
import {v4 as uuid} from "uuid";
import fs from "fs";
import log from "../../log.mjs";
import imageThumbnail from 'image-thumbnail';
import videoThumbnail from 'video-thumbnail-generator';

/*
    if a file is uploaded, the mimetype is used by default, however defining a "type" overrides this
 */

const mimetypes = ["image", "video", "youtube", "live"]

class Slide {
    constructor(name, hash, extension, type, ext1) {
        this.schema = 2
        this.id = uuid()
        this.name = name || `Slide ${this.id.substring(0,5)}`
        this.expire = 0
        this.type = type
        switch (type) {
            case "image":
                this.screentime = process.env.DEFAULT_TIME || 10
                this.hash = hash
                this.extension = extension
                break;
            case "video":
                this.hash = hash
                this.volume = ext1 || process.env.DEFAULT_VOLUME || 0
                this.extension = extension
                break;
            case "youtube":
                this.url = hash
                this.volume = ext1 || process.env.DEFAULT_VOLUME || 0
            case "live":
                this.url = hash
                this.volume = ext1 || process.env.DEFAULT_VOLUME || 0
                break;
        }
    }
}


async function upload(file) {
    return new Promise((resolve, reject) => {
        let ending = file.name.split('.').pop();
        let endName = file.md5 + "." + ending
        let endPath = `data/slides/${endName.substring(0,2)}/${endName}`
        fs.mkdir(`data/slides/${endName.substring(0,2)}`, {recursive:true}, (err)=>{
            if (err) reject(err)
            else {
                file.mv(endPath, (err) => {
                    log("NEW", `Uploaded ${endPath}`, 0)
                    if (err) reject(err)
                    else resolve({
                        "name": endName,
                        "path": endPath,
                        "extension": ending,
                        "hash": file.md5
                    })
                });
            }
        })
    })
}

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

    if (!slideshow)  return {"code": 400, "data": "SlideshowNoExistError"}

    if (!req.files.upload && req.body.url == null) return {"code": 400, "data": "NoFileError"}

    let ftype = req.body.type || req.files.upload.mimetype.split("/")[0]

    log("NEW", `Creating new slide for ${req.params.slideshow} as type ${ftype}`, 0)

    if (!mimetypes.includes(ftype)) return {"code": 400, "data": "NotValidFileTypeError"}

    let slide;

    switch(ftype) {
        case "image":
            let image = await upload(req.files.upload)
            let thumbnail = await imageThumbnail(image.path, {width: 250});
            let thumbName = `${image.hash}_THUMB.${image.extension}`
            await fs.promises.writeFile(`data/slides/${image.hash.substring(0,2)}/${thumbName}`, thumbnail)
            slide = new Slide(req.body.name, image.hash, image.extension, ftype, req.body.volume)
            break;
        case "video":
            let video = await upload(req.files.upload)
            await new Promise((resolve) => {
                const tg = new videoThumbnail.default({ // this is broken
                    sourcePath: video.path,
                    thumbnailPath: '/tmp/'
                });
                tg.generateOneByPercent(0).then((res) => {
                    fs.rename(`/tmp/${res}`, `data/slides/${video.hash.substring(0,2)}/${video.hash}_THUMB.png`, (err) => {
                        resolve()
                    })
                })
            })
            slide = new Slide(req.body.name, video.hash, video.extension, ftype, req.body.volume)
            break;
        case "youtube":
            if (!validUrl(req.body.url)) return {"code": 400, "data": "InvalidUrlError"}
            slide = new Slide(req.body.name, req.body.url, null, "youtube", req.body.volume)
            break;
        case "live":
            if (!validUrl(req.body.url)) return {"code": 400, "data": "InvalidUrlError"}
            slide = new Slide(req.body.name, req.body.url, null, "live", req.body.volume)
            break;
    }

    slideshow.slides[slide.id] = slide
    slideshow.order.push(slide.id)

    await store.writeJSON(`./data/slideshows/${req.params.slideshow}.json`, slideshow);
    log("NEW", `Updated ${req.params.slideshow} for new slide`, 0)

    log("NEW", `Created new slide by ID ${slide.id}`)

    return {"code": 200, "data": slide.id}
}