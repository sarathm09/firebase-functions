const npmModules = ['test-datasets', 'vibranium-cli']

/**
 * Utility function to convert MB to GB and round it two decimal places
 *
 * @param {number} dataInMb Data size in Megabytes
 */
const parsedDataSize = dataInMb => `${(dataInMb / 1024).toFixed(2)} GB`

const reloadChartData = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const numberOfRecords = urlParams.get('records') || urlParams.get('limit') || 30
    loadChartData(numberOfRecords, numberOfRecords)
}

const reloadBroadbandData = async () => {
    const url = 'https://us-central1-npm-downloads-reporter.cloudfunctions.net/broadbandUsage'
    await fetch(url)

    reloadChartData()
}

const reloadNpmDownloadsData = async () => {
    const url = 'https://us-central1-npm-downloads-reporter.cloudfunctions.net/npmDownloads'
    await fetch(url)

    reloadChartData()
}

/**
 * Starting point.
 * Load the different chart data and render them
 */
const loadChartData = (broadbandDataLimit = 30, npmDataLimit = 30) => {
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
            .limit(broadbandDataLimit + 1)
            .get()
            .then(data => {
                let docs = data.docs.sort((a, b) => (a > b ? 1 : -1))
                totalBroadbandUsageChart(docs.slice(1))
                dailyBroadbandUsageChart(docs, broadbandDataLimit)
            })
    } catch (e) {
        console.error(e)
    }
}

const getAxisConfigForBroadbandChart = data => ({
    x: {
        type: 'category',
        categories: data.map(doc => doc.id),
        tick: {
            rotate: -45,
            multiline: false
        }
    },
    y: {
        tick: {
            format: d => (d / 1024).toFixed(2)
        }
    }
})

const getCommonChartConfig = () => ({
    grid: {
        x: {
            show: true
        },
        y: {
            show: true
        }
    },
    tooltip: {
        format: {
            value: value => parsedDataSize(value)
        }
    }
})

/**
 * Render the total broadband usage chart
 *
 * @param {array} data Usage data
 */
const totalBroadbandUsageChart = data => {
    let breaksInGraph = []
    for (let i = 1; i < data.length; i++) {
        if (data[i].data().usageInMb.total - data[i - 1].data().usageInMb.total < 0) {
            breaksInGraph.push(i)
        }
    }
    c3.generate({
        bindto: '#total-usage-chart',
        data: {
            type: 'area',
            columns: [
                ['total', ...data.map(doc => doc.data().usageInMb.total)],
                ['upload', ...data.map(doc => doc.data().usageInMb.upload)],
                ['download', ...data.map(doc => doc.data().usageInMb.download)]
            ],
            regions: {
                total: [...breaksInGraph.map(n => ({ start: n - 1, end: n - 1, style: 'dashed' }))],
                upload: [...breaksInGraph.map(n => ({ start: n - 1, end: n - 1, style: 'dashed' }))],
                download: [...breaksInGraph.map(n => ({ start: n - 1, end: n - 1, style: 'dashed' }))]
            }
        },
        axis: getAxisConfigForBroadbandChart(data),
        ...getCommonChartConfig()
    })
    document.getElementById('over-time-usage-updated-time').innerHTML = new Date(data[data.length - 1].data().id).toLocaleString()
}

/**
 * Render the daily broadband usage chart
 *
 * @param {array} data Usage data
 */
const dailyBroadbandUsageChart = (data, broadbandDataLimit) => {
    const dailyData = []
    const initialData = data.length > broadbandDataLimit ? data[0].data() : undefined
    let prevTotal = initialData?.usageInMb?.total || 0,
        prevUpload = initialData?.usageInMb?.upload || 0,
        prevDownload = initialData?.usageInMb?.download || 0

    for (let i = 1; i < data.length; i++) {
        const doc = data[i]
        if (doc.data().usageInMb.total - prevTotal < 0) {
            prevTotal = 0
            prevUpload = 0
            prevDownload = 0
        }

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
        axis: getAxisConfigForBroadbandChart(dailyData),
        ...getCommonChartConfig()
    })

    document.getElementById('date-wise-usage-updated-time').innerHTML = new Date(data[data.length - 1].data().id).toLocaleString()
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
            type: 'spline',
            columns: [
                ['daily', ...data.map(doc => doc.data().downloads.daily || 0)],
                ['weekly', ...data.map(doc => doc.data().downloads.weekly || 0)],
                ['monthly', ...data.map(doc => doc.data().downloads.monthly || 0)],
                ['yearly', ...data.map(doc => doc.data().downloads.yearly || 0)]
            ],
            axes: {
                daily: 'y',
                weekly: 'y',
                monthly: 'y2',
                yearly: 'y2'
            },
            types: {
                daily: 'area-spline'
            }
        },
        axis: {
            x: {
                type: 'category',
                categories: data.map(doc => doc.id.replace(moduleName, '')),
                tick: {
                    rotate: -45,
                    multiline: false
                }
            },
            y2: {
                show: true
            }
        },
        ...getCommonChartConfig()
    })
    document.getElementById(`npm-${moduleName}-updated-time`).innerHTML = new Date(data[data.length - 1].data().id).toLocaleString()
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
                        <header class="card-header">
                            <p class="card-header-title">Downloads for NPM module "${m}"</p>
                            <p class="card-header-subtitle is-right" id="npm-${m}-updated-time"></p>
                            <button class="card-header-subtitle card-header-icon button is-small is-rounded" aria-label="refresh" onclick="reloadNpmDownloadsData()">
                                <span class="icon">
                                    <svg style="width: 24px; height: 24px" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M2 12C2 16.97 6.03 21 11 21C13.39 21 15.68 20.06 17.4 18.4L15.9 16.9C14.63 18.25 12.86 19 11 19C4.76 19 1.64 11.46 6.05 7.05C10.46 2.64 18 5.77 18 12H15L19 16H19.1L23 12H20C20 7.03 15.97 3 11 3C6.03 3 2 7.03 2 12Z"
                                        />
                                    </svg>
                                </span>
                            </button>
                        </header>
                        <div class="card-content">
                            <div id="daily-downloads-chart-${m}"></div>
                        </div>
                    </div>
                </div>
            </div>
			`
        )
        .join('\n')
}
