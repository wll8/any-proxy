require(`util`).inspect.defaultOptions.depth = 4 // console.log 展开对象
const util = require('./util.js')
const hookToCode = require('./hookToCode.js')
const WebSocket = require('rpc-websockets').Client
const ws = new WebSocket('ws://127.0.0.1:30005')
const mitt = require('mitt')
const emitter = mitt()

const sendRun = (opt) => {
  opt = util.mergeWithoutUndefined({
    id: ``,
    code: ``,
    args: [],
    sendOk: (...args) => console.log(`sendOk`, args),
    sendErr: (...args) => console.log(`sendErr`, args),
    runOk: (...args) => console.log(`runOk`, args),
    runErr: (...args) => console.log(`runErr`, args),
    cbArg: (...args) => console.log(`cbArg`, args),
  }, opt)
  ws.call('run', {
    id: opt.id,
    code: util.removeLeft(opt.code),
    args: opt.args,
  }).then((codeInfo) => {
    opt.sendOk(codeInfo)
    emitter.on(opt.id, (idInfo) => {
      if(idInfo.data.type === `runErr`) {
        opt.runErr(idInfo)
        emitter.off(opt.id)
      } else if(idInfo.data.type === `runOk`) {
        opt.runOk(idInfo)
        emitter.off(opt.id)
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
            const args = proxy[fnId].args
            const size = await proxy[fnId].size
            const argsProxy = Array.from({length: size}).map((item, index) => args[index])
            const fnRes = await fn(...argsProxy)
            await proxy[fnId].done(fnRes)
          },
        })
      })
    }

  }
  const { proxy } = hookToCode({sdk})
  globalThis.proxy = proxy
  proxy.console.log(`hello`)
  const arr = [`a`, `b`, `c`]
  console.time()
  const x = await proxy.Array.from(arr).findIndex(async (item, index) => {
    item = await item
    index = await index
    console.log({item, index})
    return item === `b`
  })
  console.timeEnd()
  console.log(`x`, x)
  await proxy.clear()
})