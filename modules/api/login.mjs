import * as auth from './../authenticator.mjs'
import { v4 as uuid } from 'uuid';

export default async function main(req) {
    let username = req.body.username
    let password = req.body.password
    if (!username || !password) return {"code": 400, "data": {"error": "UsernameOrPasswordNotDefinedError"}}

    if (!await auth.verifyDetails(username, password)) return {"code": 400, "data": {"error": "UsernameOrPasswordIncorrectError"}}

    if (!await auth.inGroup(username)) return {"code": 400, "data": {"error": "UserNotInGroupError"}};

    let id = uuid()

    auth.keys[id] = {
        "username": username,
        "issued": new Date(),
        "last": new Date()
    }

    return {"code": 200, "data": id}
}