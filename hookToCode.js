const proxyHook = require(`./proxyHook.js`)
const util = require(`./util.js`)
const transform = require(`./transform.js`)
const hookToCode = (opt = {}) => {
  opt = Object.assign({
    codeType: `js`, // js | aardio
    generateCodeOpt: {}, // object
  }, opt)
  const queue = new util.TaskQueue()
  const { proxy, proxyTag, userData } = proxyHook({
    userData: {
      info: {
        dataList: [],
        codeList: [],
        endLine: ``,
      },
    },
    hook(...args) {
      const transformFn = async () => transform({
        to: opt.codeType,
        proxyTag,
        list: _this.info.dataList,
        ...opt.generateCodeOpt,
      })
      const [_this, data] = args
      info = _this.info
      if (data.type === `get` && [`then`, `catch`, `endClear`].includes(data.key)) { // 这些方法自运行
        if([`endClear`].includes(data.key)) {
          const promiseFn = () => new Promise(async (resolve, reject) => {
            const {
              getError,
              clearVar,
            } = await transformFn()
            await queue.awaitEnd().catch(reject)
            if(queue.errList.length) {
              const err = getError({
                info: _this.info,
                generateCodeOpt: opt.generateCodeOpt,
                errList: queue.errList,
                path: _this.path,
              })
              return reject(err)
            }
            await clearVar().then(resolve).catch(reject)
          })
          return promiseFn
        }
        const promise = new Promise(async (resolve, reject) => {
          queue.addTask(async () => {
            if(queue.errList.length) {
              const { getError } = await transformFn()
              const err = getError({
                info: _this.info,
                generateCodeOpt: opt.generateCodeOpt,
                errList: queue.errList,
                path: _this.path,
              })
              return reject(err)
            }
            const {
              awaitCb,
              run,
            } = await transformFn()
            const snedLine = awaitCb(_this.info.endLine)
            _this.info.codeList.push(snedLine)
            return run(snedLine).then(res => {
              resolve(res)
            }).catch(err => {
              reject(err)
            })
          })
        })
        return promise[data.key].bind(promise)
      } else {
        queue.addTask(async () => {
          if(queue.errList.length) {
            return []
          }
          _this.info.dataList.push(data)
          const {
            getCode,
            run,
          } = await transformFn()
          const code = getCode()
          const line = code.at(-1)
          _this.info.endLine = line
          _this.info.codeList.push(_this.info.endLine)
          return run(_this.info.endLine)
        })
      }
      return _this.nest(data.fn)
    },
  })
  /**
   * 导出一个清除变量的方法, 而不是让用户直接调用 proxy.endClear
   * 因为 proxy.endClear 可能会是远程关键字
   * @returns 
   */
  const endClear = async () => {
    return proxy.endClear()
  }
  return {
    queue,
    proxy,
    proxyTag,
    endClear,
    userData,
  }
}

module.exports = hookToCode