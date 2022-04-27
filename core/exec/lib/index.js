'use strict'
const log = require('@zhuizhui-cli/log')
const Package = require('@zhuizhui-cli/package')
const { exec: spawn } = require('@zhuizhui-cli/utils')
const path = require('path')
const SETTINGS = {
  init: '@zhuizhui-cli/init',
  publish: '@zhuizhui-cli/publish',
}
const CACHE_DIR = 'dependencies'
async function exec(projectName, options, command) {
  if (!command) {
    command = options
    options = projectName
  }
  const cmdName = command.name()
  let pkg
  let storeDir = ''
  let targetPath = process.env.CLI_TARGET_PATH
  const homePath = process.env.CLI_HOME_PATH
  // E:\2021study\architect\zhuizhui-cli\commands\init
  // E:\2021study\architect\zhuizhui-cli\commands\publish
  const packageName = SETTINGS[cmdName]
  const packageVersion = 'latest'
  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR)
    storeDir = path.resolve(targetPath, 'node_modules')
    log.verbose('targetPath', targetPath)
    log.verbose('storeDir', storeDir)
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
      storeDir,
    })
    if (await pkg.exists()) {
      await pkg.update()
    } else {
      await pkg.install()
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    })
  }
  const rootFile = pkg.getRootFilePath()
  if (rootFile) {
    try {
      const arg = JSON.stringify([projectName, options])
      const code = `require('${rootFile}')(${arg})`
      const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit',
      })
      child.on('error', (e) => {
        log.error(e.message)
        process.exit(1)
      })
      child.on('exit', (e) => {
        process.exit(e)
      })
    } catch (error) {
      log.error(error.message)
    }
  }
}

module.exports = exec
