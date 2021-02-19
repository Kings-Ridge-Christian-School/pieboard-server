const fs = require('fs')
const objectPath = require('object-path')

function readJSON(path) {
    return new Promise((resolve, reject) => {
        fs.access(path, fs.F_OK, async (err) => {
            if (err) {
                reject(err)
            } else {
                resolve(JSON.parse(await fs.promises.readFile(path, "utf8")))
            }
        })
    })
}


function writeJSON(path, data) {
    return new Promise(async (resolve, reject) => {
        let name = path.split("/")
        name = name[name.length-1]
        fs.access(path, fs.F_OK, async (err) => {
            if (!err) await fs.promises.copyFile(path, `data/backups/${name}.${Date.now()}.bkp`)
            fs.writeFile(path, JSON.stringify(data), (err) => {
                if (err) reject(err)
                else resolve(err)
            });
        });
    });
}

function deleteJSON(path) { // seems to be a general delete function, may be moved to fileHandler
    return new Promise(async (resolve, reject) => {
        fs.unlink(path, (err) => {
            if (err) reject(err)
            else resolve()
        });
    });
}

function listJSON(path) {
    return new Promise(async (resolve, reject) => {
        let fileList = []
        fs.readdir(path, (err, files) => {
            if (err) reject(err)
            for (let file of files) {
                let n = file.split(".")
                if (n[n.length-1] == "json") fileList.push(file)
            }
            resolve(fileList)
        });
    });
}

async function updateValue(path, location, value) {
        let input = await readJSON(path)
        objectPath.set(input, location, value)
        await writeJSON(path, input)
}

async function getList(path, keys) {
    let input = await listJSON(path)
    let output = []
    for (let piece of input) {
        let pieceInfo = await readJSON(`${path}/${piece}`);
        let pieceInfoObject = {}
        for (let key of keys) pieceInfoObject[key] = pieceInfo[key]
        output.push(pieceInfoObject)
    }
    return output
}


async function initialize() {
    try {
        fs.mkdir("data/slideshows", {recursive:true}, (err) => {});
        fs.mkdir("data/devices",{recursive:true}, (err) => {})
        fs.mkdir("data/slides", {recursive:true},(err) => {})
        fs.mkdir("data/groups", {recursive:true},(err) => {})
        fs.mkdir("data/backups", {recursive:true},(err) => {})
    } catch(err) {
        console.log(err);
    }
}
exports.readJSON = readJSON
exports.writeJSON = writeJSON
exports.deleteJSON = deleteJSON
exports.listJSON = listJSON
exports.initialize = initialize
exports.updateValue = updateValue
exports.getList = getList
