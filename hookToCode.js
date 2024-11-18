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
      const [_this, data] = args
      info = _this.info
      if (data.type === `get` && [`then`].includes(data.key)) { // 取返回值
        const promise = new Promise(async (resolve) => {
          queue.addTask(async () => {
            const {
              awaitCb,
              run,
            } = transform({
              to: opt.codeType,
              proxyTag,
              list: _this.info.dataList,
              ...opt.generateCodeOpt,
            })
            const snedLine = awaitCb(_this.info.endLine)
            _this.info.codeList.push(snedLine)
            const res = await run(snedLine)
            return resolve(res)
          })
        })
        return promise[data.key].bind(promise)
      } else {
        queue.addTask(async () => {
          _this.info.dataList.push(data)
          const {
            code,
            run,
          } = transform({
            to: opt.codeType,
            proxyTag,
            list: _this.info.dataList,
            ...opt.generateCodeOpt,
          })
          const line = code().at(-1)
          _this.info.endLine = line
          _this.info.codeList.push(_this.info.endLine)
          const res = await run(_this.info.endLine)
          return res
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