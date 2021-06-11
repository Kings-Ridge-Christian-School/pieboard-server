import express from 'express'
import fs from 'fs'
const app = express()
import bodyParser from 'body-parser'
import fileUpload from 'express-fileupload'
import { v4 as uuid } from 'uuid';
import dotenv from 'dotenv'
dotenv.config()

import * as auth from "./modules/authenticator.mjs"
import * as store from "./modules/store.mjs"
import * as crypto from "./modules/crypto.mjs"
import log from "./modules/log.mjs"
import {reqLog} from './modules/log.mjs'

app.use(fileUpload())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(reqLog())

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = `${dirname(__filename)}/`;


const port = process.env.PI_PORT || 3000

class Server {
    constructor() {
        this.schema = 2
        this.id = uuid()
        this.default_group = null
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
                if (response.path) res.sendFile(__dirname + response.path)
                else res.send(response.data)
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
                if (response.path) res.sendFile(__dirname + response.path)
                else res.send(response.data)
            });
            break;
    }
    log("MAIN", `Created ${endpoint.type.toUpperCase()} mapping ${endpoint.point} --> ${endpoint.path}`)
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

            log("MAIN", "Creating default group")
            let gp = await import("./modules/api/new/general.mjs") // a bit hacky, maybe find a better solution
            let default_group = await gp.default({
                "params": {"type":"group"},
                "body":{"name":"Default"}
            });
            server.default_group = default_group.data

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
