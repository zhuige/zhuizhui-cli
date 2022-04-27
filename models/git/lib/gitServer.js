function error(methodName) {
  throw new Error(`${methodName} 方法 一定要实现`)
}
class GitServer {
  // type 类型
  // token 调用api 要用的token

  constructor(type, token) {
    this.type = type
  }
  createReop() {
    error('createReop')
  }
  createOrgReop() {
    error('createOrgReop')
  }
  getRemote() {
    error('getRemote')
  }
  getUser() {
    error('getUser')
  }
  getRepo() {
    error('getRepo')
  }
  getOrg() {
    error('getOrg')
  }
  setToken() {
    error('setToken')
  }
  getSSHKeyUrl() {
    error('getSSHKeyUrl')
  }
  getTokenHelpUrl() {
    error('getTokenHelpUrl')
  }
}
module.exports = GitServer
