const { Telegraf } = require('telegraf')
const functions = require('firebase-functions')
const { getISTDate } = require('./utils')

const bot = new Telegraf('1045746930:AAHAdsQRZm3QhNeIAekSsnDWc9eKDBi40WE')
const TELEGRAM_GROUP_ID = '857042530'

const sendBroadbandInfoMessage = async parsedUsageInfo => {
    let dataInString = `
<i>Total</i>: ${parsedUsageInfo.total}
<i>Download</i>: ${parsedUsageInfo.download}
<i>Upload</i>: ${parsedUsageInfo.upload}
<i>Balance</i>: ${parsedUsageInfo.balance}`

    bot.telegram.sendMessage(TELEGRAM_GROUP_ID, `<b><u>Broadband Usage (${getISTDate()})</u></b> \n${dataInString}`, { parse_mode: 'HTML' })
}

const sendNpmDownloadsMessage = data => {
    let dataInString = data
        .map(
            mod => `
<b>${mod.module}</b>
<i>Yesterday</i>: ${mod.lastDay}
<i>Last Week</i>: ${mod.lastWeek}
<i>Last Year</i>: ${mod.total}`
        )
        .join('\n')

    bot.telegram.sendMessage('857042530', `<b><u>NPM Downloads (${getISTDate()})</u></b> \n${dataInString}`, { parse_mode: 'HTML' })
}

const sendErrorMessage = (moduleName, error) => {
    functions.logger.error(JSON.stringify(error))
    bot.telegram.sendMessage(TELEGRAM_GROUP_ID, `<b>ERROR in ${moduleName}</b>\n${error}`, { parse_mode: 'HTML' })
}

module.exports = { sendBroadbandInfoMessage, sendErrorMessage, sendNpmDownloadsMessage }
