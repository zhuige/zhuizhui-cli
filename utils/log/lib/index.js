'use strict'

const npmlog = require('npmlog')

npmlog.level = process.env.LOG_LEVEL || 'info'
npmlog.heading = 'zhuizhui'
npmlog.addLevel('success', 2000, { fg: 'green', bold: true })

module.exports = npmlog
