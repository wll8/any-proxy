const proxyHook = require(`./proxyHook.js`)
const util = require(`./util.js`)
const transform = require(`./transform.js`)
const hookToCode = (opt = {}) => {
  opt = Object.assign({
    codeType: ``, // js | aardio
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
      if (data.type === `get` && [`then`, `catch`, `awaitEnd`].includes(data.key)) { // 这些方法自运行
        if([`awaitEnd`].includes(data.key)) {
          const promiseFn = () => new Promise(async (resolve, reject) => {
            const {
              clearVar,
            } = await transformFn()
            await queue.awaitEnd().catch(reject)
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
  return {
    queue,
    proxy,
    proxyTag,
    userData,
  }
}

module.exports = hookToCode