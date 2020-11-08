const fetch = require('node-fetch')
const functions = require('firebase-functions')
const { sendNpmDownloadsMessage, sendErrorMessage } = require('./telegram-messenger')
const { npmDownloadsCollection, getISTDate } = require('./utils')

const NPM_DOWNLOADS_URL = 'https://api.npmjs.org/downloads/point/{timePeriod}/{module}'
const MODULES_TO_READ = ['vibranium-cli', 'test-datasets']

const fetchDownloadsForModule = async (moduleName, timePeriod) => {
    let response = await fetch(NPM_DOWNLOADS_URL.replace('{module}', moduleName).replace('{timePeriod}', timePeriod))
    if (response.status === 200) {
        let data = await response.json()
        return data.downloads
    }
    return 0
}

const saveDataToFireStore = async responseData => {
    await Promise.all(
        responseData.map(m => {
            let timestamp = getISTDate(false)
            return npmDownloadsCollection.doc(`${timestamp.toDateString()} - ${m.module}`).set({
                id: Date.now(),
                module: m.module,
                timestamp,
                downloads: {
                    daily: m.lastDay,
                    weekly: m.lastWeek,
                    monthly: m.lastMonth,
                    yearly: m.total
                }
            })
        })
    )
}

const getDownloads = async (req, res) => {
    try {
        let responseData = await Promise.all(
            MODULES_TO_READ.map(async m => ({
                module: m,
                lastDay: await fetchDownloadsForModule(m, 'last-day'),
                lastWeek: await fetchDownloadsForModule(m, 'last-week'),
                lastMonth: await fetchDownloadsForModule(m, 'last-month'),
                total: await fetchDownloadsForModule(m, 'last-year')
            }))
        )

        console.log(responseData)
        functions.logger.info(JSON.stringify(responseData))

        await saveDataToFireStore(responseData)
        !!req.query.message && sendNpmDownloadsMessage(responseData)

        res.json(responseData)
    } catch (e) {
        sendErrorMessage('NPM_DOWNLOADS', e)
    }
}

module.exports = { getDownloads }
