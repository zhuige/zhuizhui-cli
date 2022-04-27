'use strict'

const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')

function getNpmInfo(npmName, registry) {
  if (!npmName) return null
  const registryUrl = registry || getDefaultRegistry()
  const npmInfoUrl = urlJoin(registryUrl, npmName)
  return axios
    .get(npmInfoUrl)
    .then((res) => {
      return res.data
    })
    .catch((err) => {})
}
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry)
  if (data) {
    return Object.keys(data.versions)
  }
  return []
}

function getSemverVersions(baseVersion, versions) {
  return versions
    .filter((version) => semver.satisfies(version, `^${baseVersion}`))
    .sort((a, b) => {
      if (semver.gt(b, a)) {
        return 1
      } else {
        return -1
      }
    })
}
async function getNpmSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry)
  const newVersions = getSemverVersions(baseVersion, versions)
  if (newVersions && newVersions.length) {
    return newVersions[0]
  }
}

function getDefaultRegistry(isOriginal = false) {
  return isOriginal
    ? 'https://registry.npmjs.org'
    : 'https://registry.npm.taobao.org'
}
async function getNpmLastestVersion(npmName, registry) {
  const versions = await getNpmVersions(npmName, registry)
  if (versions) {
    return versions.sort((a, b) => {
      if (semver.gt(b, a)) {
        return 1
      } else {
        return -1
      }
    })[0]
  }
}
module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLastestVersion
}
