import ActiveDirectory from 'activedirectory'
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
    return new Promise(async (resolve) => {
        ad.authenticate(username, password, (err, auth) => {
            auth ? resolve(true) : resolve(false)
        });
    });
}

export function inGroup(username) {
    return new Promise(async (resolve) => {
            ad.isUserMemberOf(username, authGroup, (err, auth) => {
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