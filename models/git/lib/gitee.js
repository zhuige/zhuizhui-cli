const GitServer = require('./gitServer')
const GiteeRequest = require('./giteeRequest')
class Gitee extends GitServer {
  constructor() {
    super('gitee')
    this.request = null
  }
  createReop(name) {
    return this.request.post(`/user/repos`, {
      name,
    })
  }
  getRepo(login, name) {
    return this.request.get(`/repos/${login}/${name}`)
  }
  createOrgReop(name, login) {}
  getRemote(login, name) {
    return `git@gitee.com:${login}/${name}.git`
  }
  getUser() {
    return this.request.get('/user')
  }
  getOrg(username) {
    return this.request.get(`/users/${username}/orgs`, {
      page: 1,
      per_page: 100,
    })
  }
  setToken(token) {
    this.token = token
    this.request = new GiteeRequest(token)
  }
  getSSHKeyUrl() {
    return 'https://gitee.com/profile/sshkeys'
  }
  getTokenHelpUrl() {
    return 'https://gitee.com/profile/personal_access_tokens'
  }
}
module.exports = Gitee
