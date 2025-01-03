const util = require(`./util.js`)
const proxyHook = require(`./proxyHook.js`)
const tool = require(`./to.js.js`)
const hookRun = (opt) => {
  opt = util.mergeWithoutUndefined({
    sdk: undefined,
    runType: `mainRuner`,
    clearKey: `clear`,
    exitKey: `exit`,
    idKey: `idKey_${util.guid()}`,
    parentKey: `parentKey_${util.guid()}`,
    proxyTag: `proxyTag_${util.guid()}`,
    fnTag: `fn_${util.guid()}`,
    userData: {
      info: {
        dataList: [],
        codeList: [],
        endLine: ``,
      },
    },
  }, opt)
  const jsTool = tool({
    ...opt,
  })
  const queue = new util.TaskQueue()
  const { proxy, proxyTag, userData } = proxyHook({
    userData: opt.userData,
    idKey: opt.idKey,
    parentKey: opt.parentKey,
    proxyTag: opt.proxyTag,
    fnTag: opt.fnTag,
    hook(...args) {
      const [_this, data] = args
      if (data.type === `get` && [
        `then`,
        `catch`,
        opt.clearKey,
        opt.exitKey,
      ].includes(data.key)) { // 这些方法自运行
        if([opt.clearKey].includes(data.key)) {
          const promiseFn = () => new Promise(async (resolve, reject) => {
            await util.sleep(0)
            await queue.awaitEnd().catch(reject)
            await jsTool.codeRunTool.clearVar().then(resolve).catch(reject)
          })
          return promiseFn
        }
        const promise = new Promise(async (resolve, reject) => {
          queue.addTask(async () => {
            if([`mainRuner`, `createRuner`].includes(opt.runType)) {
              const code = jsTool.codeStrTool.getReturnCode(data.parent)
              return jsTool.codeRunTool.run(code).then(resolve).catch(reject)
            }
            if([`mainRunerOnce`].includes(opt.runType)) {
              const code = jsTool.codeStrTool.getReturnCode(data.parent)
              return jsTool.codeRunTool.runDelayList(code).then(resolve).catch(reject)
            }
            if([`createRunerOnce`].includes(opt.runType)) {
              const code = jsTool.codeStrTool.getReturnCode(data.parent)
              return jsTool.codeRunTool.runDelayList(code).then(resolve).catch(reject)
            }
          })
        })
        return promise[data.key].bind(promise)
      } else {
        queue.addTask(async () => {
          if([`mainRuner`, `createRuner`].includes(opt.runType)) {
            const code = jsTool.hookDataList2CodeListByYield(data).next().value.at(-1)
            return jsTool.codeRunTool.run(code)
          }
          if([`mainRunerOnce`].includes(opt.runType)) {
            const code = jsTool.hookDataList2CodeListByYield(data).next().value.at(-1)
            return jsTool.codeRunTool.addDelayList(code)
          }
          if([`createRunerOnce`].includes(opt.runType)) {
            const code = jsTool.hookDataList2CodeListByYield(data).next().value.at(-1)
            return jsTool.codeRunTool.addDelayList(code)
          }
        })
      }
      return _this.nest(data.fn)
    },
  })
  return {
    jsTool,
    proxy,
  }
}

module.exports = hookRun
