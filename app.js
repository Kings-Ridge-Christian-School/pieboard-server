import express from 'express'
import fs from 'fs'
const app = express()
import fileUpload from "express-fileupload"
import bodyParser from "body-parser"
import { v4 as uuid } from 'uuid';
import dotenv from 'dotenv'
dotenv.config()

import * as auth from "./modules/authenticator.mjs"
import * as store from "./modules/store.mjs"
import * as crypto from "./modules/crypto.mjs"
import log from "./modules/log.mjs"
import {reqLog} from './modules/log.mjs'

app.use(bodyParser.json({limit: '2gb', extended: true}))
app.use(bodyParser.urlencoded({limit: '2gb', extended: true}))
app.use(fileUpload({
    limits: { fileSize: 1024 * 1024 * 1024 * 2 },
    useTempFiles : true,
    tempFileDir : 'data/tmp'
}));

app.use(reqLog())

const port = process.env.PI_PORT || 3000

class Device {
    constructor() {
        this.schema = 2
        this.id = uuid()
        this.name = `Device ${this.id.substring(0,5)}`
        this.group = null
        this.port = 3030
        this.key = null
        this.ip = null
        this.manifest = {}
    }
}

class Slideshow {
    constructor() {
        this.schema = 2
        this.id = uuid()
        this.name = `Slideshow ${this.id.substring(0,5)}`
        this.expire = 0
        this.slides = {}
        this.order = []
        this.isRandom = false
    }
}

class Slide {
    constructor(name, hash, extension, type, ext1) {
        this.schema = 2
        this.id = uuid()
        this.name = name || `Slide ${this.id.substring(0,5)}`
        this.expire = 0
        this.extension = extension
        this.type = type
        switch (type) {
            case "image":
                this.screentime = process.env.DEFAULT_TIME || 10
                this.hash = hash
                break;
            case "video":
                this.hash = hash
                this.volume = ext1 || process.env.DEFAULT_VOLUME || 0
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

class Group {
    constructor() {
        this.schema = 2
        this.id = uuid()
        this.name = `Group ${this.id.substring(0,5)}`
        this.devices = []
        this.slideshows = []
    }
}

class Server {
    constructor() {
        this.schema = 2
        this.id = uuid()
    }

    async initialize() {
        this.keys = await crypto.getKeypair(this.id)
    }
}


async function createEndpoint(endpoint) {
    let ep = await import(`./modules/api/${endpoint.path}.mjs`)
    switch (endpoint.type) {
        case "get":
            app.get(endpoint.point, async (req, res) => {
                if (endpoint.auth) {
                    if (!await auth.allowed(req)) {
                        res.status(403).send("Authentication Failed")
                        return
                    }
                }
                let start = new Date()
                let response = await ep.default(req)
                res.set("Processing-Time", new Date() - start)
                res.status(response.code)
                if (response.headers) for (let header of Object.keys(response.headers)) res.header(header, response.headers[header])
                if (response.type) res.type(response.type)
                res.send(response.data)
            })
            break;
        case "post":
            app.post(endpoint.point, async (req, res) => {
                if (endpoint.auth) {
                    if (!await auth.allowed(req)) {
                        res.status(403).send("Authentication Failed")
                        return
                    }
                }
                let start = new Date()
                let response = await ep.default(req)
                res.set("Processing-Time", new Date() - start)
                res.status(response.code)
                if (response.headers) for (let header of Object.keys(response.headers)) res.header(header, response.headers[header])
                if (response.type) res.type(response.type)
                res.send(response.data)
            });
            break;
    }
    log("MAIN", `Created mapping ${endpoint.point} --> ${endpoint.path}`)
}

app.listen(port, async () => {
    let start = new Date()
    log("MAIN", "Initializing storage")
    await store.initialize()
    let server = await new Promise((resolve) => {
        store.readJSON("data/server.json").then((res) => resolve(res)).catch(async (err) => {
            log("MAIN", "No server configuration", 2)
            let server = new Server()
            await server.initialize()
            await store.writeJSON("data/server.json", server);
            resolve(server);
        })
    });
    log("MAIN", "Initializing components")
    await crypto.initialize()
    await auth.initialize()
    log("MAIN", "Creating endpoints")
    let endpoints = JSON.parse(await fs.promises.readFile("./endpoints.json", "utf-8"))
    for (let endpoint of endpoints) await createEndpoint(endpoint)
    log("MAIN", `Initialized in ${new Date()-start} ms`)
});
