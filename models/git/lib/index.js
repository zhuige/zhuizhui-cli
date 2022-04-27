'use strict'
const SimpleGit = require('simple-git')
const path = require('path')
const userHome = require('user-home')
const log = require('@zhuizhui-cli/log')

const fse = require('fs-extra')
const fs = require('fs')
const { readFile, writeFile, spinnerStart } = require('@zhuizhui-cli/utils')
const terminalLink = require('terminal-link')
const inquirer = require('inquirer')
const Github = require('./github')
const Gitee = require('./gitee')
const DETAULT_CLI_HOME = '.zhuizhui-cli'
const GIT_SERVER_FILE = '.git_server'
const GIT_TOKEN_FILE = '.git_token'
const GIT_OWN_FILE = '.git_own'
const GIT_LOGIN_FILE = '.git_login'
const GIT_ROOT_DIR = '.git'
const GIT_IGNORE_FILE = '.gitignore'
const GIT_SERVER_TYPE = [
  {
    name: 'Github',
    value: 'github',
  },
  {
    name: '码云Gitee',
    value: 'gitee',
  },
]
const GIT_OWN_TYPE = [
  {
    name: '个人',
    value: 'user',
  },
  {
    name: '组织',
    value: 'org',
  },
]
const GIT_OWN_TYPE_ONLY = [
  {
    name: '个人',
    value: 'user',
  },
]
class Git {
  // TODO
  constructor(
    { name, dir, version },
    { refreshServer = false, refreshToken = false, refreshOwner = false }
  ) {
    this.name = name // 项目名称
    this.dir = dir // 源码目录
    this.version = version //项目版本
    this.git = SimpleGit(dir)
    //gitee github等
    this.gitServer = null
    this.homePath = null // 本地缓存目录
    this.user = null // git 用户信息
    this.orgs = null // git 用户组织
    this.refreshServer = refreshServer //是否重置 git类型  默认否
    this.refreshToken = refreshToken //是否重置 git token  默认否
    this.refreshOwner = refreshOwner //是否重置 git 类型
    this.owner = null //仓库类型 个人还是组织
    this.user = null //仓库登录名
    this.repo = null //远程仓库信息
    this.remote = null
  }
  async prepare() {
    this.checkHomePath() //检查缓存主目录
    await this.checkGitServer() //检查仓库类型 github 还是 gitee 等
    await this.checkGitToken() //检查仓库token
    await this.getUserAndOrgs() //获取远程仓库用户组织信息
    await this.checkGitOwner() //获取login 和 owner
    await this.checkRepo() // 检查仓库
    await this.checkGitIgnore() // 检查.gitignore 文件
    await this.init() // 本地仓库初始化
  }
  async init() {
    await this.initAndAddRemote()
    await this.initCommit()
  }
  async initCommit() {
    await this.checkConflicted() // 检查代码冲突
    await this.checkNotCommitted() // 检查未commit的
    if (await this.checkRemoteMaster()) {
    } else {
      await this.pushRemoteRepo('master')
    }
  }
  async pushRemoteRepo(branchName) {
    log.info(`推送代码到${branchName}分支`)
    await this.git.push('origin', branchName)
    log.success('推送代码成功')
  }
  async checkRemoteMaster() {
    return (await this.git.listRemote(['--refs'])).indexOf('refs/heads/master') >= 0
  }
  async checkNotCommitted() {
    const status = await this.git.status()
    if (
      status.not_added.length ||
      status.created.length ||
      status.deleted.length ||
      status.modified.length ||
      status.renamed.length
    ) {
      await this.git.add(status.not_added)
      await this.git.add(status.created)
      await this.git.add(status.deleted)
      await this.git.add(status.modified)
      await this.git.add(status.renamed)
      let message
      while (!message) {
        message = (
          await inquirer.prompt({
            type: 'input',
            name: 'message',
            message: '请输入commit 信息',
          })
        ).message
      }
      await this.git.commit(message)
      log.success('本次commit提交成功')
    }
  }
  async checkConflicted() {
    log.info('代码冲突检查')
    const spinner = spinnerStart('fetch 中...')
    await this.git.fetch()
    spinner.stop(true)
    const status = await this.git.status()
    if (status.conflicted.length) {
      throw new Error('当前代码冲突，请手动处理冲突')
    }
    log.success('代码没有冲突')
  }
  async initAndAddRemote() {
    const flag = await this.getRemote()
    if (!flag) {
      log.info('执行 git 初始化')
      await this.git.init(this.dir)
    }
    const remotes = await this.git.getRemotes()
    log.verbose('git remotes', remotes)
    if (!remotes.find((item) => item.name === 'origin')) {
      await this.git.addRemote('origin', this.remote)
      log.info('添加 git remote 成功')
    }
  }
  async getRemote() {
    const gitPath = path.resolve(this.dir, GIT_ROOT_DIR)
    this.remote = this.gitServer.getRemote(this.login, this.name)
    if (fs.existsSync(gitPath)) {
      log.success('git 已完成初始化')
      return true
    }
  }
  async checkRepo() {
    let repo
    try {
      repo = await this.gitServer.getRepo(this.login, this.name)
    } catch (error) {
      if (!error.status) {
        throw error
      }
      repo = null
    }
    if (!repo) {
      const spinner = spinnerStart('正在创建git仓库...')
      try {
        if (this.owner == 'user') {
          //个人仓库
          repo = await this.gitServer.createReop(this.name)
        } else {
          //组织仓库 在哪个组织创建仓库 login是组织名
          await this.gitServer.createOrgReop(this.name, this.login)
        }
      } finally {
        spinner.stop()
      }
      if (repo) {
        log.success('远程仓库创建成功')
      } else {
        throw new Error('远程仓库创建失败')
      }
    } else {
      log.success('远程仓库信息获取成功')
    }
    this.repo = repo
    log.verbose('仓库信息', this.repo)
  }
  async checkGitToken() {
    const tokenPath = this.createPath(GIT_TOKEN_FILE)
    let token = readFile(tokenPath)
    log.notice('提醒：请记得要配置SSH公钥 ' + terminalLink('链接:', this.gitServer.getSSHKeyUrl()))
    if (!token || this.refreshToken) {
      log.warn(
        this.gitServer.type +
          ' token未生成，请生成' +
          terminalLink('链接:', this.gitServer.getTokenHelpUrl())
      )
      token = (
        await inquirer.prompt({
          type: 'password',
          name: 'token',
          message: '请将token复制到这',
          default: '',
        })
      ).token
      writeFile(tokenPath, token)
      log.success('git token 写入成功', `**** -> ${tokenPath}`)
    } else {
      log.success('git token 获取成功', `**** => ${tokenPath}`)
    }
    this.token = token
    this.gitServer.setToken(token)
  }
  async checkGitServer() {
    const gitServerPath = this.createPath(GIT_SERVER_FILE)
    let gitServer = readFile(gitServerPath)
    if (!gitServer || this.refreshServer) {
      gitServer = (
        await inquirer.prompt({
          type: 'list',
          name: 'gitServer',
          message: '选择git仓库类型',
          default: 'github',
          choices: GIT_SERVER_TYPE,
        })
      ).gitServer
      writeFile(gitServerPath, gitServer)
      log.success('git server 写入成功', `${gitServer} -> ${gitServerPath}`)
    } else {
      log.success('git server 获取成功', `${gitServer}`)
    }
    this.gitServer = this.createGitServer(gitServer.trim())
    if (!this.gitServer) {
      throw new Error('gitServer初始化失败')
    }
  }
  async getUserAndOrgs() {
    this.user = await this.gitServer.getUser()
    if (!this.user) {
      throw new Error('用户信息获取失败')
    }
    this.orgs = await this.gitServer.getOrg(this.user.login)
    if (!this.orgs) {
      throw new Error('用户组织获取失败')
    }
  }
  async checkGitIgnore() {
    const gitIgnore = path.resolve(this.dir, GIT_IGNORE_FILE)
    if (!fs.existsSync(gitIgnore)) {
      writeFile(
        gitIgnore,
        `.DS_Store
node_modules
/dist

/tests/e2e/videos/
/tests/e2e/screenshots/

# local env files
.env.local
.env.*.local

# Log files
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw*

# Lock File
# package-lock.json
# yarn.lock
`
      )
      log.success(`自动写入.gitignore文件成功`)
    }
  }
  createGitServer(gitServer) {
    if (gitServer == 'github') {
      return new Github()
    } else if (gitServer == 'gitee') {
      return new Gitee()
    } else {
      return null
    }
  }
  async checkGitOwner() {
    const ownerPath = this.createPath(GIT_OWN_FILE)
    const loginPath = this.createPath(GIT_LOGIN_FILE)
    let owner = readFile(ownerPath)
    let login = readFile(loginPath)
    if (!owner || !login || this.refreshOwner) {
      owner = (
        await inquirer.prompt({
          type: 'list',
          name: 'owner',
          message: '请选择远程仓库类型',
          default: 'github',
          choices: this.orgs.length ? GIT_OWN_TYPE : GIT_OWN_TYPE_ONLY,
        })
      ).owner
      if (owner == 'user') {
        login = this.user.login
      } else {
        login = (
          await inquirer.prompt({
            type: 'list',
            name: 'login',
            message: '请选择远程仓库类型',
            default: 'github',
            choices: this.orgs.map((item) => ({
              name: item.login,
              value: item.login,
            })),
          })
        ).login
      }
      writeFile(ownerPath, owner)
      log.success('owner写入成功', owner)
      writeFile(loginPath, login)
      log.success('login写入成功', login)
    } else {
      log.success('获取owner成功', owner)
      log.success('获取login成功', login)
    }
    this.owner = owner
    this.login = login
  }
  createPath(file) {
    const rootDir = path.resolve(this.homePath, GIT_ROOT_DIR)
    const filePath = path.resolve(rootDir, file)
    fse.ensureDirSync(rootDir)
    return filePath
  }
  checkHomePath() {
    if (!this.homePath) {
      if (process.env.CLI_HOME_PATH) {
        this.homePath = process.env.CLI_HOME_PATH
      } else {
        this.homePath = path.resolve(userHome, DETAULT_CLI_HOME)
      }
    }
    fse.ensureDirSync(this.homePath)
    if (!fs.existsSync(this.homePath)) {
      throw new Error('获取用户主目录失败')
    }
  }
}
module.exports = Git
