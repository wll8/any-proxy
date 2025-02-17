const hookToCode = require(`./hookToCode.js`)
const sdkPromise = require(`./sdkPromise.js`)
const util = require(`./util.js`)

const obj = {
  sdkPromise,
  anyHook: hookToCode,
}

module.exports = obj
