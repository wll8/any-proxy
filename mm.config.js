const { Worker } = require("worker_threads");
globalThis.wsMap = {}
const seprateThread = new Worker(__dirname + `/seprateThread.js`);
seprateThread.on(`message`, (data) => {
  if(data.type === `send`) {
    sendData(globalThis.wsMap[data.wsId], data.id, data.resObj)
  }
});
const util = require('./util.js');

const cli = process.argv.map(item => `"${item}"`).join(` `)
console.log(cli)

/**
 * @see: https://www.hongqiye.com/doc/mockm/config/option.html
 * @type {import('mockm/@types/config').Config}
 */
module.exports = mockmUtil => {
  return {
    port: 20005,
    testPort: 20006,
    replayPort: 20007,
    api: {
      'ws /rpc'(ws, req) {
        const wsId = util.guid()
        globalThis.wsMap[wsId] = ws
        globalThis.wsMap[wsId].on('message', (msg) => {
          const obj = JSON.parse(msg)
          if (obj.method === `run`) {
            seprateThread.postMessage({
              type: `run`,
              wsId,
              obj,
            });
          }
        })
        globalThis.wsMap[wsId].on(`close`, () => { })
      }
    },
  }
}

/**
 * 发送消息
 * @param {*} ws 
 * @param {*} id 
 * @param {*} opt 
 */
function sendData(ws, id, opt = {}) {
  const resObj = util.mergeWithoutUndefined({
    /**
     * 错误信息
     */
    err: undefined,
    /**
     * 函数返回值
     */
    res: [],
    /**
     * 函数返回值的数据类型
     */
    resType: [],
  }, opt)
  resObj.resType = resObj.res.map(item => {
    return util.isType(item)
  })
  const str = JSON.stringify({
    id,
    jsonrpc: `2.0`,
    result: [resObj]
  })
  ws.send(str)
}