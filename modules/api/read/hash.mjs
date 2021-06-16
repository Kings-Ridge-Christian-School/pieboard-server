import * as store from "./../../store.mjs"

export default async function main(req) {
    return {"code": 200, "path": `data/slides/${req.params.name.substring(0,2)}/${req.params.name}`}
}