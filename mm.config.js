/**
 * @see: https://www.hongqiye.com/doc/mockm/config/option.html
 * @type {import('mockm/@types/config').Config}
 */
module.exports = util => {
  return {
    port: 10005,
    testPort: 10006,
    replayPort: 10007,
    api: {
      'ws /rpc'(ws, req) {
        ws.on('message', (msg) => {
          const obj = JSON.parse(msg)
          if (obj.method === `run`) {
            run(ws, obj)
          }
        })
        ws.on(`close`, () => { })
      }
    },
  }
}

/**
 * 动态运行 js
 * @param {*} ws 
 * @param {*} obj 
 */
async function run(ws, obj) {
  // todo fnArgs 中应支持使用参数名和参数值
  const [fnStr, ...fnArgs] = obj.params
  console.log(`fnStr`, fnStr)
  
  /**
   * 以 new Function 方式运行代码, 运行 require 时报错 require is not defined
   * @returns 
   */
  function typeB() {
    const argNameList = fnArgs.map((item, index) => JSON.stringify(`arg${index}`)).join(`,`)
    const fn = new Function(...argNameList, fnStr)
    return fn(...fnArgs)
  }
  
  /**
   * 可以运行 require
   * @returns 
   */
  function typeC() {
    const js = `;((...args) => {${fnStr}})(${fnArgs.map(item => JSON.stringify(item)).join(`, `)});`
    return eval(js)
  }
  
  let res = undefined
  let err = undefined
  try {
    // const resObj = typeB()
    const resObj = typeC()
    res = JSON.parse(JSON.stringify(typeof(resObj) === `undefined` ? null : resObj))
  } catch (error) {
    err = String(error)
  }
  const str = JSON.stringify({
    id: obj.id,
    jsonrpc: `2.0`,
    result: [err, res]
  })
  ws.send(str)
}
