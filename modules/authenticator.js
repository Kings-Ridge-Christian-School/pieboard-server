// not in use until further notice
const ActiveDirectory = require('activedirectory');
require('dotenv').config()

const CACHE_TIME = process.env.CACHE_TIME || 60
const config = { url: process.env.AD_URL,
    baseDN: process.env.AD_BASEDN,
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD }
    
const authGroup = process.env.PI_AUTH_GROUP
var ad = new ActiveDirectory(config);

var tmpUserDB = {}

let adCache = {}

function allowedByCache(username, group) {
    if (adCache[username] != null) {
        if (adCache[username].expire > new Date()) {
            if (adCache[username].group == group) {
                return true
            } else return false
        } else return false
    } else return false
}

function inGroup(username) {
    return new Promise(async (resolve) => {
        if (allowedByCache(username, authGroup)) {
            resolve(true)
        } else {
            ad.isUserMemberOf(username, authGroup, (err, auth) => {
                if (auth) {
                    let exp = new Date()
                    exp.setSeconds(exp.getSeconds() + CACHE_TIME);
                    adCache[username] = {
                        "expire": exp,
                        "group": authGroup
                    }
                    resolve(true)
                } else resolve(false)
            });
        }
    });
}

function verifyDetails(username, password) {
    return new Promise(async (resolve) => {
        ad.authenticate(username, password, (err, auth) => {
            auth ? resolve(true) : resolve(false)
        });
    });
}

async function isVerified(cookies) {
    if (process.env.TEST_ENV == 1) {
        return true
    }
    else if (cookies.id == null) {
        return false
    } else {
        if (tmpUserDB[cookies.id] != null) {
            if (await inGroup(tmpUserDB[cookies.id].username)) {
                return true
            } else {
                return false
            }
        } else {
            return false
        }
    }
}

function addNewUser(key, username) {
    tmpUserDB[key] = {
        "username": username,
        "authTime": new Date()
    }
}

exports.inGroup = inGroup
exports.verifyDetails = verifyDetails
exports.isVerified = isVerified
exports.addNewUser = addNewUser