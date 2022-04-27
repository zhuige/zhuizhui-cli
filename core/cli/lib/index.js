'use strict'

module.exports = cli
/**
 * require支持的文件 .js .json .node
 * .js -> exports / module.exports
 * .json -> JSON.parse
 * 其他文件 -> 当作 .js 处理
 */
const semver = require('semver')
const colors = require('colors/safe')
const userHome = require('user-home')
const pathExists = require('path-exists').sync
const commander = require('commander')

const path = require('path')

const pkg = require('../package.json')
const log = require('@zhuizhui-cli/log')
const { DEFAULT_CLI_HOME } = require('./const')
const exec = require('@zhuizhui-cli/exec')
const program = new commander.Command()
async function cli() {
  try {
    await prepare()
    registerCommand()
  } catch (e) {
    log.error(e.message)
  }
}
function registerCommand() {
  //debug模式
  program.on('option:debug', function () {
    process.env.LOG_LEVEL = 'verbose'
    log.level = process.env.LOG_LEVEL
    log.verbose('cli', '现在是调试模式')
  })
  program.on('option:targetPath', function (val) {
    process.env.CLI_TARGET_PATH = val
  })
  //未知命令监听
  program.on('command:*', function (obj) {
    const availableCommands = program.commands.map((cmd) => cmd.name())
    console.log(colors.red('未知的命令: ' + obj[0]))
    console.log(colors.green('可用命令为: ' + availableCommands.join(',')))
  })
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>','指定本地调试文件路径','')
  //命令注册
  program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化')
    .action(exec)

  program
    .command('publish')
    .option('--refreshServer','强制更新远程Git仓库')
    .option('--refreshToken','强制更新远程Git仓库token')
    .option('--refreshOwner','强制更新远程Git仓库类型')
    .action(exec)

  program.parse(process.argv)
  if (program.args && program.args.length < 1) {
    program.outputHelp()
    console.log()
  }
}
async function prepare(){
  checkPkgVersion()
  checkRoot()
  checkUserHome()
  checkEnv()
  await checkGlobalUpdate()
}
async function checkGlobalUpdate() {
  const currentVersion = pkg.version
  const npmName = pkg.name
  const { getNpmSemverVersion } = require('@zhuizhui-cli/get-npm-info')
  const lastVersion = await getNpmSemverVersion(currentVersion, npmName)
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      '更新提示',
      colors.yellow(
        `请手动更新${npmName},当前版本:${currentVersion},最新版本${lastVersion},更新命令:npm install -g ${npmName}`
      )
    )
  }
}

function checkEnv() {
  const dotenv = require('dotenv')
  const dotenvPath = path.resolve(userHome, '.env')
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath,
    })
  }
  createDefaultConfig()
}
function createDefaultConfig() {
  const cliHome = path.join(
    userHome,
    process.env.CLI_HOME || DEFAULT_CLI_HOME
  )
  process.env.CLI_HOME_PATH = cliHome
}
function checkUserHome() {
  //判断用户主目录有没有
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不存在！'))
  }
}
function checkRoot() {
  const rootCheck = require('root-check')
  rootCheck()
}

//检查版本号
function checkPkgVersion() {
  log.info('cli', `version:${pkg.version}`)
}
