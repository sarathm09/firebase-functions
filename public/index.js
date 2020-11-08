const npmModules = ['test-datasets', 'vibranium-cli']

/**
 * Utility function to convert MB to GB and round it two decimal places
 *
 * @param {number} dataInMb Data size in Megabytes
 */
const parsedDataSize = dataInMb => `${(dataInMb / 1024).toFixed(2)} GB`

/**
 * Starting point.
 * Load the different chart data and render them
 */
const loadChartData = (broadbandDataLimit = 50, npmDataLimit = 50) => {
    try {
        let db = firebase.firestore()
        const npmDownloadsCollection = db.collection('npm-downloads')
        const broadbandUsageCollection = db.collection('broadband-usage')

        npmModules.forEach(m => {
            npmDownloadsCollection
                .where('module', '==', m)
                .orderBy('timestamp', 'desc')
                .limit(npmDataLimit)
                .get()
                .then(data => {
                    let docs = data.docs.sort((a, b) => (a > b ? 1 : -1))
                    dailyDownloadsChart(m, docs)
                })
        })

        broadbandUsageCollection
            .orderBy('timestamp', 'desc')
            .limit(broadbandDataLimit)
            .get()
            .then(data => {
                let docs = data.docs.sort((a, b) => (a > b ? 1 : -1))
                totalBroadbandUsageChart(docs)
                dailyBroadbandUsageChart(docs)
            })
    } catch (e) {
        console.error(e)
    }
}

/**
 * Render the total broadband usage chart
 *
 * @param {array} data Usage data
 */
const totalBroadbandUsageChart = data => {
    c3.generate({
        bindto: '#total-usage-chart',
        data: {
            columns: [
                ['total', ...data.map(doc => doc.data().usageInMb.total)],
                ['upload', ...data.map(doc => doc.data().usageInMb.upload)],
                ['download', ...data.map(doc => doc.data().usageInMb.download)]
            ]
        },
        axis: {
            x: {
                type: 'category',
                categories: data.map(doc => doc.id)
            },
            y: {
                tick: {
                    format: d => (d / 1024).toFixed(2)
                }
            }
        },
        tooltip: {
            format: {
                value: value => parsedDataSize(value)
            }
        }
    })
}

/**
 * Render the daily broadband usage chart
 *
 * @param {array} data Usage data
 */
const dailyBroadbandUsageChart = data => {
    const dailyData = []
    let prevTotal = 0,
        prevUpload = 0,
        prevDownload = 0

    for (let i = 0; i < data.length; i++) {
        const doc = data[i]

        dailyData.push({
            id: doc.id,
            total: doc.data().usageInMb.total - prevTotal,
            upload: doc.data().usageInMb.upload - prevUpload,
            download: doc.data().usageInMb.download - prevDownload
        })

        prevTotal = doc.data().usageInMb.total
        prevUpload = doc.data().usageInMb.upload
        prevDownload = doc.data().usageInMb.download
    }
    c3.generate({
        bindto: '#daily-usage-chart',
        data: {
            type: 'bar',
            columns: [
                ['total', ...dailyData.map(doc => doc.total)],
                ['download', ...dailyData.map(doc => doc.download)],
                ['upload', ...dailyData.map(doc => doc.upload)]
            ]
        },
        axis: {
            x: {
                type: 'category',
                categories: dailyData.map(doc => doc.id)
            },
            y: {
                tick: {
                    format: d => (d / 1024).toFixed(2)
                }
            }
        },
        tooltip: {
            format: {
                value: value => parsedDataSize(value)
            }
        }
    })
}

/**
 * Render the daily download chart for a given npm module
 *
 * @param {string} moduleName NPM module name
 * @param {array} data NPM module download data
 */
const dailyDownloadsChart = (moduleName, data) => {
    c3.generate({
        bindto: `#daily-downloads-chart-${moduleName}`,
        data: {
            columns: [
                ['daily', ...data.map(doc => doc.data().downloads.daily || 0)],
                ['weekly', ...data.map(doc => doc.data().downloads.weekly || 0)],
                ['monthly', ...data.map(doc => doc.data().downloads.monthly || 0)],
                ['yearly', ...data.map(doc => doc.data().downloads.yearly || 0)]
            ]
        },
        axis: {
            x: {
                type: 'category',
                categories: data.map(doc => doc.id.replace(moduleName, ''))
            }
        }
    })
}

/**
 * Create one dynamic HTML element for each NPM module
 */
const createDynamicElements = () => {
    document.getElementById('cards').innerHTML += npmModules
        .map(
            m => `
            <div class="columns">
                <div class="column is-full">
                    <div class="card">
                        <div class="card-content">
                            <p class="subtitle">Downloads for NPM module "${m}"</p>
                            <div id="daily-downloads-chart-${m}"></div>
                        </div>
                    </div>
                </div>
            </div>
			`
        )
        .join('\n')
}
