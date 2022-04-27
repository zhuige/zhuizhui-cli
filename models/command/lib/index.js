'use strict'
const semver = require('semver')
const colors = require('colors/safe')
const log = require('@zhuizhui-cli/log')
const LOWEST_NODE_VERSION = '12.0.0'
class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error('Command，参数不能为空')
    }
    if (!Array.isArray(argv)) {
      throw new Error('Command，参数必须为数组')
    }
    if (argv.length < 1) {
      throw new Error('Command，参数列表为空')
    }
    this._argv = argv
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve()
      chain = chain.then(() => this.checkNodeViersion())
      chain = chain.then(() => this.initArgs())
      chain = chain.then(() => this.init())
      chain = chain.then(() => this.exec())
      chain.catch((err) => {
        log.error(err.message)
      })
    })
  }
  //检测 node版本 我们可能使用node api在低版本不支持
  checkNodeViersion() {
    const currentVersion = process.version
    const lowestVersion = LOWEST_NODE_VERSION
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(
        colors.red(
          `zhuizhui-cli需要安装 v${lowestVersion} 以上的Node.js版本,你当前的版本是${currentVersion}`
        )
      )
    }
  }
  initArgs() {
    this.cmdOptions = this._argv[1]
  }
  init() {
    throw new Error('init 必须要实现')
  }
  exec() {
    throw new Error('exec 必须要实现')
  }
}

module.exports = Command
