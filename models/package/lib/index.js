'use strict'
const { isObject } = require('@zhuizhui-cli/utils')
const formatPath = require('@zhuizhui-cli/format-path')
const {
  getDefaultRegistry,
  getNpmLastestVersion,
} = require('@zhuizhui-cli/get-npm-info')
const pkgDir = require('pkg-dir').sync
const npminstall = require('npminstall')
const pathExists = require('path-exists').sync
const path = require('path')
const fse = require('fs-extra')
class Package {
  constructor(options) {
    if (!options) {
      throw new Error('package类的参数不能为空')
    }
    if (!isObject(options)) {
      throw new Error('package类的参数必须为对象')
    }
    //package路径
    this.targetPath = options.targetPath
    //缓存路径
    this.storeDir = options.storeDir
    this.packageName = options.packageName
    this.packageVersion = options.packageVersion
    this.cacheFilePathPrefix = this.packageName.replace('/', '_')
  }
  async prepare() {
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir)
    }
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLastestVersion(this.packageName)
    }
  }
  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    )
  }
  //判断package是否存在
  async exists() {
    if (this.storeDir) {
      await this.prepare()
      return pathExists(this.cacheFilePath)
    } else {
      return pathExists(this.targetPath)
    }
  }
  //安装package
  async install() {
    await this.prepare()
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
    })
  }
  async update() {
    await this.prepare()
    const latestVersion = await getNpmLastestVersion(this.packageName)
    const latestFilePath = this.getSpecificCacheFilePath(latestVersion)
    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{ name: this.packageName, version: latestVersion }],
      })
      this.packageVersion = latestVersion
    }else{
      this.packageVersion = latestVersion
    }
    return latestFilePath
  }
  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
    )
  }
  //获取入口文件的路径
  getRootFilePath() {
    let packagePath = ''
    if (this.storeDir) {
      packagePath = this.cacheFilePath
    } else {
      packagePath = this.targetPath
    }
    const dir = pkgDir(packagePath)
    if (dir) {
      const pkgFile = require(path.resolve(dir, 'package.json'))
      if (pkgFile && pkgFile.main) {
        return formatPath(path.resolve(dir, pkgFile.main))
      }
    }
    return null
  }
}

module.exports = Package
