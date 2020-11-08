const admin = require('firebase-admin')

admin.initializeApp({
    credential: admin.credential.applicationDefault()
})

const db = admin.firestore()
const npmDownloadsCollection = db.collection('npm-downloads')
const broadbandUsageCollection = db.collection('broadband-usage')

const parsedDataSize = dataInMb => `${(dataInMb / 1024).toFixed(2)} GB`

const getISTDate = (stringFormat = true) => {
    let d = new Date()
    let timeObject = new Date(d.getTime() + (d.getTimezoneOffset() * 60000 + 3600000 * 5.5))
    return stringFormat ? timeObject.toLocaleString() : timeObject
}

module.exports = { npmDownloadsCollection, broadbandUsageCollection, parsedDataSize, getISTDate }
