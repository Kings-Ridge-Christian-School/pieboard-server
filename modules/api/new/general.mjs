import * as store from "./../../store.mjs"
import {v4 as uuid} from "uuid";
import log from "./../../log.mjs"

/*
    States:
    0: new device, uninitialized
    1: device found
    2: keys exchanged, device is ready

 */

class Device {
    constructor(name) {
        this.schema = 2
        this.id = uuid()
        this.name = name || `Device ${this.id.substring(0,5)}`
        this.group = null
        this.port = 3030
        this.key = null
        this.ip = null
        this.state = 0
        this.manifest = {}
    }
}

class Slideshow {
    constructor(name) {
        this.schema = 2
        this.id = uuid()
        this.name = name || `Slideshow ${this.id.substring(0,5)}`
        this.expire = 0
        this.slides = {}
        this.order = []
        this.isRandom = false
    }
}

class Group {
    constructor(name) {
        this.schema = 2
        this.id = uuid()
        this.name = name || `Group ${this.id.substring(0,5)}`
        this.devices = []
        this.slideshows = []
    }
}

export default async function main(req) {

    let cl;

    let type = req.params.type.toLowerCase()

    switch (type) {
        case "slideshow":
            cl = new Slideshow(req.body.name)
            break;
        case "device":
            cl = new Device(req.body.name)
            break;
        case "group":
            cl = new Group(req.body.name)
            break;
        default:
            return {"code": 404, "data": "UnknownTypeError"}
    }


    await store.writeJSON(`./data/${type}s/${cl.id}.json`, cl)
    log("NEW", `Created new ${type} by ID ${cl.id}`)

    return {"code": 200, "data": cl.id}
}