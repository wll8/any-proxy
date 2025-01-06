require(`util`).inspect.defaultOptions.depth = 4 // console.log 展开对象

const hookToCode = require('./hookToCode.js')
const util = require('./util.js')
const WebSocket = require('rpc-websockets').Client
const mitt = require('mitt')
const emitter = mitt()

function getSdk(key = `rpc`) {
  globalThis[key] = globalThis[key] || {}
  const rpc = globalThis[key]
  rpc.wsLink = `ws://127.0.0.1:30005`;
  rpc.sdkPromise = rpc.sdkPromise || new Promise(async (resolve, reject) => {
    const ws = new WebSocket(rpc.wsLink)
    const sendRun = (opt) => {
      opt = util.mergeWithoutUndefined({
        id: ``,
        code: ``,
        args: [],
        argsName: `args`,
        runType: `mainRuner`,
        sendOk: (...args) => console.log(`sendOk`, args),
        sendErr: (...args) => console.log(`sendErr`, args),
        runOk: (...args) => console.log(`runOk`, args),
        runErr: (...args) => console.log(`runErr`, args),
        cbArg: (...args) => console.log(`cbArg`, args),
      }, opt)
      ws.call('run', opt).then((codeInfo) => {
        opt.sendOk(codeInfo)
        emitter.on(opt.id, (idInfo) => {
          if(idInfo.data.type === `runErr`) {
            opt.runErr(idInfo)
            emitter.off(opt.id)
          } else if(idInfo.data.type === `runOk`) {
            opt.runOk(idInfo)
          } else if(idInfo.data.type === `cbArg`) {
            opt.cbArg(idInfo)
          }
        })
      }).catch(err => {
        opt.sendErr(err)
      })
    }
    ws.on('open', async () => {
      ws.subscribe(`codeMsg`)
      ws.on(`codeMsg`, (idInfo) => {
        emitter.emit(idInfo.id, idInfo)
      })
      const sdk = {
        async run([opt], ctx) {
          return new Promise((resolve, reject) => {
            const id = util.guid()
            sendRun({
              id,
              ...opt,
              sendOk(){},
              runErr(idInfo){
                reject(idInfo.data.res)
              },
              runOk(idInfo){
                resolve(idInfo.data.res)
              },
              cbArg: async (idInfo) => {
                const [fnId] = idInfo.data.res
                const fn = ctx.idToFn(fnId)
                const { proxy } = hookToCode({sdk, variablePrefix: `cb`})
                let args = proxy[fnId].args
                if(util.isType(fn, `function`)) {
                  args = await args
                }
                const size = await proxy[fnId].size
                const argsProxy = Array.from({length: size}).map((item, index) => args[index])
                const fnRes = await fn(...argsProxy)
                await proxy[fnId].next(fnRes)
              },
            })
          })
        }
    
      }
      resolve(sdk)
    })
    ws.on(`error`, reject)
  });
  return rpc.sdkPromise
}
module.exports = {
  getSdk,
}