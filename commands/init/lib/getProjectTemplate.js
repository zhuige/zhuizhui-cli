const request = require('@zhuizhui-cli/request')
module.exports = function () {
  return request({ url: '/project/template' })
}
