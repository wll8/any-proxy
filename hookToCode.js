const util = require(`./util.js`)
const proxyHook = require(`./proxyHook.js`)
const tool = require(`./to.js.js`)
const hookRun = ({sdk}) => {
  const opt = {
    clearKey: `clear`,
    exitKey: `exit`,
    idKey: `idKey_${util.guid()}`, // 当前id
    parentKey: `parentKey_${util.guid()}`, // 父级id
    proxyTag: `proxyTag_${util.guid()}`, // 有这个标记这说明是代理对象
    userData: {
      info: {
        dataList: [],
        codeList: [],
        endLine: ``,
      },
    },
  }
  const jsTool = tool({
    sdk,
    proxyTag: opt.proxyTag,
  })
  const queue = new util.TaskQueue()
  const { proxy, proxyTag, userData } = proxyHook({
    userData: opt.userData,
    idKey: opt.idKey,
    parentKey: opt.parentKey,
    proxyTag: opt.proxyTag,
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
            const code = jsTool.codeStrTool.getReturnCode(data.parent)
            return jsTool.codeRunTool.run(code).then(res => {
              resolve(res)
            }).catch(err => {
              reject(err)
            })
          })
        })
        return promise[data.key].bind(promise)
      } else {
        queue.addTask(async () => {
          const code = jsTool.hookDataList2CodeListByYield(data).next().value.at(-1)
          return jsTool.codeRunTool.run(code)
        })
      }
      return _this.nest(data.fn)
    },
  })
  return {
    proxy,
  }
}

module.exports = hookRun
