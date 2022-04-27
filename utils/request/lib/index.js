'use strict'

const axios = require('axios').default
const baseURL = 'http://127.0.0.1:7001'
const timeout = 5000
const request = axios.create({
  baseURL,
  timeout,
})
request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (err) => {
    return Promise.reject(err)
  }
)
module.exports = request
