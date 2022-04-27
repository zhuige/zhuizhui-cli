'use strict'

const Command = require('@zhuizhui-cli/command')
const log = require('@zhuizhui-cli/log')
const fs = require('fs')
const fse = require('fs-extra')
const ejs = require('ejs')
const glob = require('glob')
const inquirer = require('inquirer')
const semver = require('semver')
const Package = require('@zhuizhui-cli/package')
const { spinnerStart, execPromise } = require('@zhuizhui-cli/utils')
const path = require('path')
const userHome = require('user-home')
const getProjectTemplate = require('./getProjectTemplate')
const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'
const WHITE_COMMAND = ['npm']
const TEMPLATE_TYPE_NORMAL = 'normal'
const TEMPLATE_TYPE_CUSTOM = 'custom'
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = !!this.cmdOptions.force
    log.verbose('projectName', this.projectName)
    log.verbose('force', this.force)
  }
  async exec() {
    try {
      const projectInfo = await this.prepare()
      if (projectInfo) {
        log.verbose('projectInfo', projectInfo)
        this.projectInfo = projectInfo
        await this.downloadTemplate()
        await this.installTemplate()
      }
    } catch (e) {
      log.error(e.message || e)
    }
  }
  async installTemplate() {
    if (this.templateInfo) {
      this.templateInfo.type = this.templateInfo.type || TEMPLATE_TYPE_NORMAL
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        //标准模板
        await this.installNormalTemplate()
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        //自定义模板
        await this.installCustomTemplate()
      } else {
        throw new Error('项目模板类型无法识别！')
      }
    } else {
      throw new Error('项目模板不存在！')
    }
  }
  async ejsRender({ ignore }) {
    const cwd = process.cwd()
    return new Promise((resolve, reject) => {
      glob(
        '**',
        {
          cwd,
          ignore,
          nodir: true,
        },
        (err, files) => {
          if (err) {
            reject(err)
          }
          Promise.all(
            files.map((file) => {
              const filePath = path.join(cwd, file)
              return new Promise((resolve1, reject1) => {
                ejs.renderFile(filePath, this.projectInfo, {}, (err, res) => {
                  if (err) {
                    reject1(err)
                  } else {
                    fse.writeFileSync(filePath, res)
                    resolve1(res)
                  }
                })
              })
            })
          )
            .then((res) => {
              resolve()
            })
            .catch((err) => {
              reject(err)
            })
        }
      )
    })
  }

  async installNormalTemplate() {
    const spinner = spinnerStart('正在安装模板...')
    try {
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template')
      const targetPath = process.cwd()
      fse.ensureDirSync(templatePath)
      fse.ensureDirSync(targetPath)
      fse.copySync(templatePath, targetPath)
    } finally {
      spinner.stop(true)
    }
    const templateIgnore = this.templateInfo.ignore || []
    const ignore = ['**/node_modules/**', ...templateIgnore]
    await this.ejsRender({ ignore })
    log.success('安装模板成功')
    let installRes
    let { installCommand, startCommand } = this.templateInfo
    if (installCommand) {
      log.info('开始安装依赖')
      installCommand = installCommand.split(' ')
      const cmd = this.checkCommand(installCommand[0])
      const args = installCommand.slice(1)
      installRes = await execPromise(cmd, args, {
        cwd: process.cwd(),
        stdio: 'inherit',
      })
    }
    if (installRes !== 0) {
      throw new Error('依赖安装失败！')
    }
    if (startCommand) {
      log.info('正在启动项目')
      startCommand = startCommand.split(' ')
      const cmd = this.checkCommand(startCommand[0])
      const args = startCommand.slice(1)
      installRes = await execPromise(cmd, args, {
        cwd: process.cwd(),
        stdio: 'inherit',
      })
    }
    if (installRes !== 0) {
      throw new Error('启动项目失败！')
    }
  }
  checkCommand(command) {
    if (!WHITE_COMMAND.includes(command)) {
      throw new Error('安装命令不存在! 命令：npm')
    }
    return command
  }
  async installCustomTemplate() {
    if (await this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath()
      if (fs.existsSync(rootFile)) {
        log.notice('开始执行自定义模板')
        const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template')
        const options = {
          templateInfo:this.templateInfo,
          sourcePath: templatePath,
          projectInfo:this.projectInfo,
          targetPath: process.cwd(),
        }
        const code = `require('${rootFile}')(${JSON.stringify(options)})`
        await execPromise('node', ['-e', code], {
          cwd: process.cwd(),
          stdio: 'inherit',
        })
        log.success('自定义模板安装成功')
      }
    } else {
      throw new Error('自定义模板入口文件不在!')
    }
  }
  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo
    const { npmName, version } = (this.templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    ))
    const targetPath = path.resolve(userHome, '.zhuizhui-cli', 'template')
    const storeDir = path.resolve(userHome, '.zhuizhui-cli', 'template', 'node_modules')
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    })
    if (!(await templateNpm.exists())) {
      const spinner = spinnerStart('正在下载模板...')
      try {
        await templateNpm.install()
        this.templateNpm = templateNpm
      } finally {
        spinner.stop(true)
      }
      log.success('下载模板成功')
    } else {
      const spinner = spinnerStart('正在更新模板...')
      try {
        await templateNpm.update()
        this.templateNpm = templateNpm
      } finally {
        spinner.stop(true)
      }
      log.success('更新模板成功')
    }
  }
  async prepare() {
    // 判断项目模板是否存在
    const template = await getProjectTemplate()
    if (!template || !template.length) {
      throw new Error('项目模板不存在')
    }
    this.template = template
    const localPath = process.cwd()
    if (!this.isDirEmpty(localPath)) {
      const tipsDeleteDir = async () => {
        const { confirmDelete } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirmDelete',
          default: false,
          message: '是否清空当前目录下的文件？',
        })
        if (confirmDelete) {
          //清空当前目录 危险操作!!!
          fse.emptyDirSync(localPath)
        }
      }
      if (!this.force) {
        const { ifContinue } = await inquirer.prompt({
          name: 'ifContinue',
          type: 'confirm',
          message: '当前文件夹不为空，是否继续创建项目',
          default: false,
        })
        if (!ifContinue) {
          return
        }
        await tipsDeleteDir()
      } else {
        await tipsDeleteDir()
      }
    }
    return this.getProjectInfo()
  }
  async getProjectInfo() {
    const isValidName = (v) => {
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9]*)$/.test(v)
    }
    let projectInfo = {}
    let isProjectNameValid = false
    if (isValidName(this.projectName)) {
      isProjectNameValid = true
      projectInfo.projectName = this.projectName
    }
    const { type } = await inquirer.prompt({
      type: 'list',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      name: 'type',
      choices: [
        { name: 'web项目', value: TYPE_PROJECT },
        { name: '组件项目', value: TYPE_COMPONENT },
      ],
    })
    this.template = this.template.filter((template) => template.tag.includes(type))
    const projectNamePrompt = isProjectNameValid
      ? []
      : [
          {
            type: 'input',
            message: '请输入项目名称',
            name: 'projectName',
            default: 'zhuizhui-project',
            validate(v) {
              if (!isValidName(v)) {
                return new Error('请输入合法名称，例如：zhuizhui-project，zhuizhui_project 等等')
              }
              return true
            },
            filter(v) {
              return v
            },
          },
        ]
    const projectPrompt = [
      ...projectNamePrompt,
      {
        type: 'input',
        message: '请输入项目版本号',
        name: 'projectVersion',
        default: '1.0.0',
        validate(v) {
          if (!semver.valid(v)) {
            return new Error('请输入合法版本号，例如：1.0.0 或 v1.0.0')
          }
          return true
        },
        filter(v) {
          return semver.valid(v) || v
        },
      },
      {
        type: 'list',
        message: '请选择项目模板',
        name: 'projectTemplate',
        choices: this.createTemplateChoice(),
      },
    ]
    if (type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: 'input',
        message: '请输入组件描述信息',
        name: 'componentDescription',
        default: '',
        validate(v) {
          if (!v) {
            return new Error('请输入组件描述信息')
          }
          return true
        },
      }
      projectPrompt.push(descriptionPrompt)
    }
    const project = await inquirer.prompt(projectPrompt)
    projectInfo = { ...projectInfo, type, ...project }
    if (projectInfo.projectName) {
      projectInfo.name = require('kebab-case')(projectInfo.projectName).replace(/^-/, '')
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription
    }
    return projectInfo
  }
  isDirEmpty(localPath) {
    const fileList = fs
      .readdirSync(localPath)
      .filter((file) => !file.startsWith('.') && ['node_modules'].indexOf(file) < 0)
    return !fileList.length
  }
  createTemplateChoice() {
    return this.template.map((item) => {
      return {
        value: item.npmName,
        name: item.name,
      }
    })
  }
}

function init(argv) {
  try {
    return new InitCommand(argv)
  } catch (error) {
    log.error(error.message)
  }
}
exports.InitCommand = InitCommand

module.exports = init
