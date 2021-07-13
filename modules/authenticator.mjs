import ActiveDirectory from 'activedirectory2'
import log from "./log.mjs"
import dotenv from 'dotenv'
dotenv.config()

let VALID_TIME = process.env.AUTH_VALID || 30

VALID_TIME *= 1000*60*60

const config = { url: process.env.AD_URL,
    baseDN: process.env.AD_BASEDN,
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD }

const authGroup = process.env.AD_GROUP
let ad;

export let keys = {}

export function verifyDetails(username, password) {
    log("AUTH", `verifying details for ${username}`, 0)
    return new Promise(async (resolve) => {
        ad.authenticate(username, password, (err, auth) => {
            if (err) log("AUTH", err, 3)
            auth ? resolve(true) : resolve(false)
        });
    });
}

export function inGroup(username) {
    log("AUTH", `verifying group permissions for ${username}`, 0)
    return new Promise(async (resolve) => {
            ad.isUserMemberOf(username, authGroup, (err, auth) => {
                if (err) log("AUTH", err, 3)
                if (auth) {
                    resolve(true)
                } else resolve(false)
            });
    });
}

export async function allowed(req) {

    if (process.env.BYPASS_AUTHENTICATION == "true") return true

    let info = keys[req.body.auth] || keys[req.query.auth] || keys[req.get("Authorization")]

    if (!info) return false

    if (info.last/1 > new Date()/1-VALID_TIME) {
        info.last = new Date()
        return true
    } else return false
}


export async function initialize() {
    ad = new ActiveDirectory(config);
    if (process.env.BYPASS_AUTHENTICATION == "true") log("AUTH", "Authentication disabled!", 2)
    log("AUTH", "Initialized", 0)
}