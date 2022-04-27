const axios = require('axios')
const BASE_URL = 'https://gitee.com/api/v5'
class GiteeRequest {
  constructor(token) {
    this.token = token
    this.service = axios.default.create({
      baseURL: BASE_URL,
      timeout: 5000,
    })
    this.service.interceptors.response.use(
      (res) => {
        return res.data
      },
      (err) => {
        if (err.response.data) {
          return Promise.reject(err.response)
        } else {
          return Promise.reject(err)
        }
      }
    )
  }
  get(url, params, headers) {
    return this.service({
      url,
      params: {
        access_token: this.token,
        ...params,
      },
      headers,
    })
  }
  post(url, data, headers) {
    return this.service({
      url,
      method: 'post',
      params: {
        access_token: this.token,
      },
      data,
      headers,
    })
  }
}
module.exports = GiteeRequest
