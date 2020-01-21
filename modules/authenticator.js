// not in use until further notice

function inGroup(username) {
    return new Promise(async (resolve) => {
        ad.isUserMemberOf(username, authGroup, (err, auth) => {
            auth ? resolve(true) : resolve(false)
        });
    });
}

function verifyDetails(username, password) {
    return new Promise(async (resolve) => {
        ad.authenticate(username, password, (err, auth) => {
            auth ? resolve(true) : resolve(false)
        });
    });
}

async function check(cookies) {
    if (cookies.id == null) {
        return false
    } else {
        if (tmpUserDB[cookies.id].username != null) {
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

exports.inGroup = inGroup
exports.verifyDetails = verifyDetails
exports.check = check