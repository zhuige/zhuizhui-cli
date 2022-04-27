'use strict'
const cp = require('child_process')
const fs = require('fs')
function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]'
}

function spinnerStart(msg = 'loading', spinnerStr = '|/-\\') {
  const Spinner = require('cli-spinner').Spinner
  const spinner = new Spinner(msg + ' %s')
  spinner.setSpinnerString(spinnerStr)
  spinner.start()
  return spinner
}

function exec(command, args, options) {
  const win32 = process.platform === 'win32'
  const cmd = win32 ? 'cmd' : command
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args
  return cp.spawn(cmd, cmdArgs, options || {})
}
function execPromise(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = exec(command, args, options || {})
    child.on('error', (err) => {
      resolve(1)
    })
    child.on('exit', (e) => {
      resolve(e)
    })
  })
}
function readFile(path, options = {}) {
  if (fs.existsSync(path)) {
    const buffer = fs.readFileSync(path)
    if (buffer) {
      if (options.toJson) {
        return buffer.toJSON()
      } else {
        return buffer.toString()
      }
    }
  }
  return null
}
function writeFile(path, data, { rewrite = true } = {}) {
  if (fs.existsSync(path)) {
    if (rewrite) {
      fs.writeFileSync(path, data)
      return true
    }
    return false
  } else {
    fs.writeFileSync(path, data)
    return true
  }
}
module.exports = {
  isObject,
  spinnerStart,
  exec,
  execPromise,
  readFile,
  writeFile,
}
