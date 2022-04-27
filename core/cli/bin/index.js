#!/usr/bin/env node

const importLocal = require('import-local')

if (importLocal(__filename)) {
  require('npmlog').info('cli', '正在使用zhuizhui-cli本地版本（当前空间目录的版本）')
} else {
  require('../lib/index')()
}
