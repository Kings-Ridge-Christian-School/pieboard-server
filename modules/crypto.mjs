import * as openpgp from 'openpgp'
import * as store from './store.mjs'
import log from './log.mjs'
let keys = {}

export async function getKeypair(name) {
    let keys = await openpgp.generateKey({curve: "ed25519", userIDs: [{"name": name}]})
    log("CRYPTO", `Generated keypair for ${name}`, 0)
    return {
        "private": keys.privateKey,
        "public": keys.publicKey,
        "revocation": keys.revocationCertificate
    }
}

export async function encrypt(input, recvKey) {
    if (typeof input == "Object") input = JSON.stringify(input)

    const privateKey = await openpgp.readKey({ armoredKey: keys.private })
    const publicKey = await openpgp.readKey({armoredKey: recvKey})

    let options = {
        message: await openpgp.createMessage({text: input}),
        encryptionKeys: publicKey,
        signingKeys: privateKey
    }

    const out = await openpgp.encrypt(options)

    return out
}

export async function decrypt(message, recvKey) {
    const out = await openpgp.decrypt({
        message: await openpgp.readMessage({
            armoredMessage: message // parse armored message
        }),
        verificationKeys: await openpgp.readKey({armoredKey: recvKey}),
        decryptionKeys: await openpgp.readKey({ armoredKey: keys.private })
    });

    if (!await out.signatures[0].verified) log("CRYPTO", `Message is not validly signed!`, 2)

    return out.data
}

export async function initialize() {
    let server = await store.readJSON("data/server.json")
    keys = server.keys

    let testMessage = await encrypt(server.id, keys.public)

    let out = await decrypt(testMessage, keys.public)

    if (out != server.id) throw Error("Server keys are invalid")
    log("CRYPTO", "Verified server keys", 0)

    log("CRYPTO", "Initialized", 0)
}