const typeMap = {
    0: "VERBOSE",
    1: null,
    2: "WARN",
    3: "FATAL"
}

let requireName;

import dotenv from 'dotenv'
dotenv.config()

const LOGLEVEL = process.env.LOGLEVEL === null ? 1 : parseInt(process.env.LOGLEVEL)

export default function log(src, info, type) {
    if (type == null) type = 1
    if (requireName) if (requireName != src) return
    if (type < LOGLEVEL) return
    if (type != 1) console.log(`[${new Date().toISOString()}] [${typeMap[type]}] [${src}] ${info}`)
    else console.log(`[${new Date().toISOString()}] [${src}] ${info}`)
}


export function reqLog() {
    return function logger(req, res, next) {
        log("WEB", `[${req.method.toUpperCase()}] ${req.originalUrl}`);
        next();
    };
}

export function require(name) { // so workers can suppress init messages
    requireName = name
}