'use strict'
const Command = require('@zhuizhui-cli/command')
const log = require('@zhuizhui-cli/log')
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const Git = require('@zhuizhui-cli/git')
class publishCommand extends Command {
  init() {
    //处理参数
    log.verbose('publish 处理参数',this.cmdOptions)
  }
  prepare() {
    // 确认是否为npm项目
    const projectPath = process.cwd()
    const pkgPath = path.resolve(projectPath, 'package.json')
    if (!fs.existsSync(pkgPath)) {
      throw new Error('package.json不存在')
    }
    // 确认有没有build命令 例如 npm run build
    const pkg = fse.readJsonSync(pkgPath)
    const { name, version, scripts } = pkg
    if (!name || !version || !scripts || !scripts.build) {
      throw new Error('package.json信息不全，请检查是否存在name，version，scripts(提供build命令)')
    }
    this.projectInfo = { name, version, dir: projectPath }
  }
  async exec() {
    try {
      //记录时间
      const startTime = Date.now()
      //1. 初始化检测
      this.prepare()
      //2. 自动化git flow
      const git = new Git(this.projectInfo,this.cmdOptions)
      await git.prepare()
      //3. 云构建
      const endTime = Date.now()
      log.info(`本次发布耗时：${(endTime - startTime) / 1000}s`)
    } catch (e) {
      log.error(e.message)
      log.verbose(e)
    }
  }
}
function init(argv) {
  try {
    return new publishCommand(argv)
  } catch (error) {
    log.error(error.message)
  }
}
exports.publishCommand = publishCommand

module.exports = init
