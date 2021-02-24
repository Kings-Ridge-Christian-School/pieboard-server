const fs = require('fs')

async function save(file, name, extension) {
    return new Promise((resolve, reject) => {
        let endName = `${name}.${extension}`
        let endPath = `data/slides/${endName.substring(0,2)}/${endName}`
        fs.mkdir(`data/slides/${endName.substring(0,2)}`, {recursive:true}, (err)=>{
            if (err) reject(err)
            else {
                file.mv(endPath, (err) => {
                    if (err) reject(err)
                    else resolve({
                        "name": endName,
                        "path": endPath
                    })
                });
            }
        })
    })
}

exports.save = save