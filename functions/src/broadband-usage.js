const fetch = require('node-fetch')
const FormData = require('form-data')

const { sendBroadbandInfoMessage, sendErrorMessage } = require('./telegram-messenger')
const { broadbandUsageCollection, getISTDate, parsedDataSize } = require('./utils')

const saveDataToFireStore = async (usage, parsedUsageInfo) => {
    let timestamp = getISTDate(false)
    await broadbandUsageCollection.doc(`${timestamp.toDateString()}`).set({
        timestamp,
        id: Date.now(),
        usage: parsedUsageInfo,
        usageInMb: {
            download: +usage[0].curretUsage.downloadOctets,
            upload: +usage[0].curretUsage.uploadOctets,
            balance: +usage[0].balance.totalOctets,
            total: +usage[0].curretUsage.totalOctets
        }
    })
}

const printInfo = async (data, req, res) => {
    if (!!data && data.length === 1) {
        const usage = JSON.parse(data[0].usage)
        const parsedUsageInfo = {
            download: parsedDataSize(usage[0].curretUsage.downloadOctets),
            upload: parsedDataSize(usage[0].curretUsage.uploadOctets),
            balance: parsedDataSize(usage[0].balance.totalOctets),
            total: parsedDataSize(usage[0].curretUsage.totalOctets)
        }

        await saveDataToFireStore(usage, parsedUsageInfo)

        !!req.query.message && (await sendBroadbandInfoMessage(parsedUsageInfo))

        res.json(parsedUsageInfo)
    }
}

const getBroadbandUsage = async (req, res) => {
    const formdata = new FormData()
    formdata.append('subscriberCode', 'CN165948')

    const requestOptions = {
        method: 'POST',
        body: formdata,
        redirect: 'follow'
    }

    const result = await fetch('https://myabb.in/totalBalance', requestOptions)
        .then(response => response.json())
        .catch(error => sendErrorMessage('broadbandUsage', error))

    await printInfo(result, req, res)
}

module.exports = { getBroadbandUsage }
