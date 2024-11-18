const toAardio = require(`./to.aardio.js`)
const toJs = require(`./to.js.js`)

const transform = (opt = {}) => {
  opt = Object.assign({
    to: ``, // js, aardio
    proxyTag: ``, // string
    list: [], // 数据列表
  }, opt)
  if ([`js`].includes(opt.to)) {
    return {
      run: async (code = ``) => {
        return new Promise(async (res, rej) => {
          setTimeout(() => {
            try {
              res(eval(code))
            } catch (err) {
              rej(err)
            }
          }, Math.random() * 0)
        })
      },
      awaitCb: (endLine) => {
        const re = new RegExp(`^(.+?)\\=`)
        const varName = endLine.match(re)[1].trim()
        const snedLine = varName
        return snedLine
      },
      code: () => {
        return toJs({
          ...opt,
          proxyTag: opt.proxyTag,
          list: opt.list,
        })
      }
    }
  } else if ([`aardio`].includes(opt.to)) {
    return {
      run: async (code = ``) => {
        return new Promise(async (res, rej) => {
          setTimeout(() => {
            try {
              res(code)
            } catch (err) {
              rej(err)
            }
          }, Math.random() * 0)
        })
      },
      awaitCb: (endLine) => {
        const re = new RegExp(`^(.+?)\\=`)
        const varName = endLine.match(re)[1].trim()
        const snedLine = `// send ${varName}`
        return snedLine
      },
      code: () => {
        return toAardio({
          ...opt,
          proxyTag: opt.proxyTag,
          list: opt.list,
        })
      }
    }
  }
}

module.exports = transform
