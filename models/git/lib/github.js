const GitServer = require('./gitServer')
const githubRequest = require('./githubRequest')
class Github extends GitServer {
  constructor() {
    super('github')
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
  createOrgReop() {}
  getRemote(login, name) {
    return `git@github.com:${login}/${name}.git`
  }
  getUser() {
    return this.request.get('/user')
  }
  getOrg(username) {
    return this.request.get(`/user/orgs`, {
      page: 1,
      per_page: 100,
    })
  }
  setToken(token) {
    this.token = token
    this.request = new githubRequest(token)
  }
  getSSHKeyUrl() {
    return 'https://github.com/settings/keys'
  }
  getTokenHelpUrl() {
    return 'https://github.com/settings/tokens'
  }
}
module.exports = Github
