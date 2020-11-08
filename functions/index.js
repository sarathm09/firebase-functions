const functions = require('firebase-functions')
const { getDownloads } = require('./src/npm-downloads')
const { getBroadbandUsage } = require('./src/broadband-usage')

exports.npmDownloads = functions.https.onRequest((request, response) => getDownloads(request, response))

exports.broadbandUsage = functions.https.onRequest((request, response) => getBroadbandUsage(request, response))

exports.hello = functions.https.onRequest((request, response) => response.json({ hello: 'world', params: request.params, query: request.query }))
