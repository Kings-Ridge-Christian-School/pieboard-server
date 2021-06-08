const typeMap = {
    0: "VERBOSE",
    1: null,
    2: "WARN",
    3: "FATAL"
}

let requireName;


export default function log(src, info, type) {
    if (requireName) if (requireName != src) return
    if (type != null) console.log(`[${new Date().toISOString()}] [${src}] [${typeMap[type]}] ${info}`)
    else console.log(`[${new Date().toISOString()}] [${src}] ${info}`)
}


export function reqLog() {
    return function logger(req, res, next) {
        log("WEB", `${req.originalUrl}`);
        next();
    };
}

export function require(name) { // so workers can suppress init messages
    requireName = name
}