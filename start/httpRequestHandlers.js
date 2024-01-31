
const getHeaders = (req) => {
    const headers = {}
    req.forEach((key, value) => {
        headers[key.toLowerCase()] = value
    })

    return headers
}

const  readJson = ( res ) => {
    return new Promise((resolve, reject) => {
        let buffer;
        res.onData((ab, isLast) => {
            let chunk = Buffer.from(ab);
            if (isLast) {
                let json = null;
                try {
                    if (buffer) json = JSON.parse( Buffer.concat([buffer, chunk]).toString() )
                    else json = JSON.parse(chunk.toString())
                } catch (e) {
                    return reject('error parse json')
                }

                return resolve(json)
            } else {
                if (buffer) buffer = Buffer.concat([buffer, chunk]);
                else buffer = Buffer.concat([chunk]);
            }
        })

    })

}
