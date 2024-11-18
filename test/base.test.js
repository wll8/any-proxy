require(`util`).inspect.defaultOptions.depth = 4 // console.log 展开对象
import { describe, expect, test } from 'vitest'
const createCloud = require(`../createCloud.js`)
const util = require(`../util.js`)
const toJs = require(`../to.js.js`)

const queue = new util.TaskQueue()
test(`code`, async () => {
  let list = []
  let codeList = []
  const {proxy: vm, proxyTag} = createCloud({
    id: ``,
    async cb(...args) {
      const [_this, more] = args
      const line = toJs({
        proxyTag,
        variableKeyword: 'var',
        variablePrefix: 'v',
        list,
        lib: [
          `fsys.lnk`,
          `fsys.dlg`,
        ],
      }).at(-1)
      return new Promise(async(resolve) => {
        queue.addTask(async () => {
          const varName = line.match(/^var(.+?)\=/)[1].trim()
          const code = `// send ${varName}`
          const res = await util.remote(code)
          codeList.push(res)
          return resolve(res)
        })
      })
    },
    hook(...args) {
      const [_this, more] = args
      const data = more
      list.push(data)
      const line = toJs({
        proxyTag,
        variableKeyword: 'var',
        variablePrefix: 'v',
        list,
        lib: [
          `fsys.lnk`,
          `fsys.dlg`,
        ],
      }).at(-1)
      queue.addTask(async () => {
        const res = await util.remote(line)
        codeList.push(res)
        return res
      })
    },
  })
  
  const lnk = vm.fsys.lnk()
  lnk.description = `程序描述`
  lnk.path = vm.io._exepath
  lnk.setIcon(lnk.path)
  lnk.save(`我的程序.lnk`)
  const lnk2 = lnk.load(`我的程序.lnk`)
  lnk2.save(`我的程序2.lnk`)
  vm.console.log(`path`, lnk2.path)

  await queue.awaitEnd()
  const fs = require(`fs`)

  
  fs.writeFileSync(`list.json`, JSON.stringify({proxyTag, list}, null, 2))
  console.log(`str`)
  console.log(codeList.join(`\n`))
}, 0)