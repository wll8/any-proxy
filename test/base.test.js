require(`util`).inspect.defaultOptions.depth = 4 // console.log 展开对象
const createCloud = require(`../createCloud.js`)
const util = require(`../util.js`)
const toJs = require(`../to.js.js`)

const queue = new util.TaskQueue()
new Promise(async () => {
  let info = {}
  const { proxy: vm, proxyTag } = createCloud({
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
            const varName = _this.info.endLine.match(/^var(.+?)\=/)[1].trim()
            const snedLine = `// send ${varName}`
            _this.info.codeList.push(snedLine)
            const res = await util.remote(snedLine)
            return resolve(res)
          })
        })
        return promise[data.key].bind(promise)
      } else {
        _this.info.dataList.push(data)
        const line = toJs({
          proxyTag,
          variableKeyword: 'var',
          variablePrefix: 'v',
          list: _this.info.dataList,
          lib: [
            `fsys.lnk`,
            `fsys.dlg`,
          ],
        }).at(-1)
        _this.info.endLine = line
        _this.info.codeList.push(_this.info.endLine)
        queue.addTask(async () => {
          const res = await util.remote(_this.info.endLine)
          return res
        })
      }
      return _this.nest(data.fn)
    },
  })

  const lnk = vm.fsys.lnk()
  lnk.description = `程序描述`
  lnk.path = vm.io._exepath
  lnk.pathxxx = await vm.io._exepath
  lnk.setIcon(lnk.path)
  lnk.save(`我的程序.lnk`)
  const lnk2 = lnk.load(`我的程序.lnk`)
  lnk2.save(`我的程序2.lnk`)
  vm.console.log(`path`, lnk2.path)

  await queue.awaitEnd()
  const fs = require(`fs`)


  // fs.writeFileSync(`list.json`, JSON.stringify({proxyTag, list}, null, 2))
  console.log(`str`)
  console.log(info.codeList.join(`\n`))
})