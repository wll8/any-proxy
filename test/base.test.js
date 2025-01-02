require(`util`).inspect.defaultOptions.depth = 4 // console.log 展开对象

import { describe, expect, test } from 'vitest'
const hookToCode = require(`../hookToCode.js`)
const util = require(`../util.js`)

/**
 * 连续运行
 * @param {*} opt 
 */
async function runnerTest(opt = {}) {
  const sdk = await require(`../sdkPromise.js`)
  opt = util.mergeWithoutUndefined({
    sdk,
  }, opt)
  test(`proxy.process.env.OS -- 即时取值`, async () => {
    const { proxy } = hookToCode(opt)
    const OS = await proxy.process.env.OS
    console.log(OS)
    await proxy.clear()
    expect(OS).toBeTypeOf(`string`)
  })
  test(`msg/process.msg2 全局空间设置和获取值`, async () => {
    const { proxy, userData } = hookToCode(opt)
    const id1 = util.guid()
    const id2 = util.guid()
    proxy[id1] = `msg`
    proxy.process[id2] = `msg2`
    const msg = await proxy[id1]
    const msg2 = await proxy.process[id2]
    await proxy.clear()
    const res = {msg, msg2}
    console.log(res)
    expect(res).toStrictEqual({ msg: 'msg', msg2: 'msg2' })
  })
  test(`proxy.process.myFile = proxy.__filename -- 挂载 __filename 到 process.myFile`, async () => {
    const { proxy, userData } = hookToCode(opt)
    const id = util.guid()
    proxy.process[id] = proxy.__filename
    const name = await proxy.process[id]
    await proxy.clear()
    console.log({name})
    expect(name).toBeTypeOf(`string`)
  })
  test(`fs.statSync(proxy.process.myFile) -- 函数的参数使用挂载的变量`, async () => {
    const { proxy, userData } = hookToCode(opt)
    const id = util.guid()
    proxy.process[id] = proxy.__filename
    const fs = proxy.require(`fs`)
    const {size} = await fs.statSync(proxy.process[id], `utf8`)
    await proxy.clear()
    console.log({size})
    expect(size).toBeTypeOf(`number`)
  })
  test(`require('fs').statSync -- 函数连续调用并获取返回值的属性`, async () => {
    const { proxy, userData } = hookToCode(opt)
    const size = await proxy.require(`fs`).statSync(proxy.__filename, `utf8`).size
    const size2 = await proxy.require(`fs`).statSync(proxy.__filename, {
      encoding: `utf8`,
    }).size
    await proxy.clear()
    console.log({size, size2})
    expect(size).toBeTypeOf(`number`)
    expect(size2).toBeTypeOf(`number`)
  })
  test(`赋值、取值、函数调用`, async () => {
    const { proxy, userData, queue } = hookToCode(opt)
    const id = util.guid()
    const id2 = util.guid()
    const id3 = util.guid()
    proxy[id] = `msg`
    proxy.process[id2] = `msg2`
    proxy.process[id3] = proxy.__filename
    const msg = await proxy[id]
    const msg2 = await proxy.process[id2]
    const fs = proxy.require(`fs`)
    const {size} = await fs.statSync(proxy.process[id3], `utf8`)
    const pid = await proxy.process.pid
    const res = {msg, msg2, sizeType: typeof(size), pidType: typeof(pid)}
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual({ msg: 'msg', msg2: 'msg2', sizeType: 'number', pidType: 'number' })
  })
  test(`proxy.Math.max(proxy.a, proxy.b) -- 引用多个远程参数`, async () => {
    const { proxy, userData } = hookToCode(opt)
    const a = util.guid()
    const b = util.guid()
    proxy[a] = 1
    proxy[b] = 2
    const res = await proxy.Math.max(proxy[a], proxy[b])
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(2)
  })
  test(`proxy.Array.from([proxy.a, proxy.b]) -- 在数组中引用多个远程参数`, async () => {
    const { proxy, userData } = hookToCode(opt)
    const a = util.guid()
    const b = util.guid()
    proxy[a] = 1
    proxy[b] = 2
    const res = await proxy.Array.from([proxy[a], proxy[b]])
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual([1, 2])
  })
  test(`proxy.Array.from([proxy.a.a, proxy.b.b]) -- 在数组中引用多个远程参数 -- 对象中取值`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const a = util.guid()
    const b = util.guid()
    proxy[a] = {a: 1}
    proxy[b] = {b: 2}
    const res = await proxy.Array.from([proxy[a].a, proxy[b].b])
    console.log(res)
    expect(res).toStrictEqual([1, 2])
  })
  test(`使用之前设置的变量`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const a = util.guid()
    const b = util.guid()
    proxy[a] = 1
    proxy[b] = 2
    const res = await proxy.Array.from([proxy[a], proxy[b]])
    console.log(res)
    await proxy.clear()
    const { proxy: proxy2 } = hookToCode(opt)
    // 还可以再拿到的 a 和 b
    const res2 = await proxy2.Array.from([proxy2[a], proxy2[b]])
    console.log(res2)
    await proxy.clear()
    expect(res2).toStrictEqual([1, 2])
  })
  test(`readme 中的 demo`, async () => {
    const { proxy } = hookToCode(opt)
    const a = util.guid()
    const b = util.guid()
    proxy[a] = 1
    proxy[b] = 2
    const res = await proxy.Math.max(proxy[a], proxy[b])
    await proxy.clear()
    expect(res).toStrictEqual(2)
  })
  test(`解构对象`, async () => {
    const { proxy } = hookToCode(opt)
    const { Math } = proxy
    let {globalThis: {[util.guid()]: a, [util.guid()]: b}} = proxy
    a = 1
    b = 2
    const c = util.guid()
    proxy[c] = 3
    const res = await Math.max(a, b, proxy[c])
    await proxy.clear()
    expect(res).toStrictEqual(3)
  })
  test(`不解构数组`, async () => {
    const id = util.guid()
    const { proxy } = hookToCode({sdk})
    proxy[id] = [{a: 1}, {b: 2}]
    const arg0 = proxy[id][0]
    const arg1 = proxy[id][1]
    const res = {
      arg0: await arg0,
      arg1: await arg1,
    }
    console.log(res)
    await proxy.clear()
  })
  test.todo(`暂不支持解构数组`, async () => {
    const id = util.guid()
    const { proxy } = hookToCode({sdk})
    proxy[id] = [{a: 1}, {b: 2}]
    const [arg0, arg1] = proxy[id]
    const res = {
      arg0: await arg0,
      arg1: await arg1,
    }
    console.log(res)
    await proxy.clear()
  })
  test(`获取错误信息 -- 读取一个未声明的变量应抛出错误 -- 在 Math.max 和 clear 中获取错误`, async () => {
    const { proxy } = hookToCode(opt)
    const { Math } = proxy
    let {undeclaredVariablesA, undeclaredVariablesB} = proxy
    const res = await Math.max(undeclaredVariablesA, undeclaredVariablesB).catch(String)
    console.log(res)
    await proxy.clear().catch(String)
    expect(res).toStrictEqual(`ReferenceError: undeclaredVariablesA is not defined`)
  })
  test(`获取错误信息 -- 读取一个未声明的变量应抛出错误 -- 在 catch 例如 clear 中获取错误(由于异步实现, 不能即时获取错误)`, async () => {
    const { proxy } = hookToCode(opt)
    let {undeclaredVariablesA, undeclaredVariablesB} = proxy
    const res = await proxy.clear().catch(String)
    console.log(res)
    expect(res).toStrictEqual(`ReferenceError: undeclaredVariablesA is not defined`)
  })
  test(`获取错误信息 -- 调用不存在的方法, 在 clear 中获取之前未捕获的错误`, async () => {
    const { proxy } = hookToCode(opt)
    const a = util.guid()
    const b = util.guid()
    const c = util.guid()
    proxy[a][b][c]()
    const res = await proxy.clear().catch(String)
    console.log(res)
    expect(res).toStrictEqual(`ReferenceError: ${a} is not defined`)
  })
  test(`获取错误信息 -- 调用不存在的方法, 在 clear 中也抛出同样的错误`, async () => {
    const { proxy } = hookToCode(opt)
    const a = util.guid()
    const b = util.guid()
    const c = util.guid()
    const err = `ReferenceError: ${a} is not defined`
    const res1 = await proxy[a][b][c]().catch(String)
    const res2 = await proxy.clear().catch(String)
    console.log(res1, res2)
    expect(res1).toStrictEqual(err)
    && expect(res2).toStrictEqual(err)
  })
  test(`通过索引赋值`, async () => {
    const { proxy } = hookToCode(opt)
    const id = util.guid()
    proxy[id] = [1, 2, 3, `4.4`]
    proxy[id][1] = `h.1ello`
    const res = await proxy[id][1]
    console.log({res})
    await proxy.clear()
    expect(res).toStrictEqual(`h.1ello`)
  })
  test(`通过索引取值`, async () => {
    const { proxy } = hookToCode(opt)
    const res = await proxy.Array.from([1, 2, 3, `4.4`])[1]
    console.log({res})
    await proxy.clear()
    expect(res).toStrictEqual(2)
  })
  test(`当返回值为 undefined 时收到的是 null -- 因为 json 不支持 undefined`, async () => {
    const { proxy } = hookToCode(opt)
    const res = await proxy.console.log(`hello`)
    console.log(res)
    await proxy.clear()
    expect(res).toBe(null)
  })
  test(`向函数传字面量 -- 数字`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const res = await proxy.Math.max(1,2,3)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(3)
  })
  test(`向函数传字面量 -- 字符串`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const data = `hello`
    const res = await proxy.String(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  test(`向函数传字面量 -- 布尔值`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const res = await proxy.Boolean(true)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(true)
  })
  
  test(`向函数传字面量 -- null`, async () => {
    const { proxy, queue, userData } = hookToCode(opt)
    const arr = proxy.Array()
    arr.push(null)
    const res = await arr
    await proxy.clear()
    console.log(res)
    expect(res).toStrictEqual([null])
  })
  
  test(`向函数传字面量 -- undefined`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const arr = proxy.Array()
    arr.push(undefined)
    const res = await arr
    await proxy.clear()
    console.log(res)
    expect(res).toStrictEqual([null])
  })
  test(`向函数传对象 -- 对象`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const data = {a: 1, b: 2}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  test(`向函数传对象 -- 对象中包含代理的方法调用`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const max = proxy.Math.max(1, 2)
    const data = {a: 1, b: 2, max}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual({
      a: 1, b: 2, max: 2
    })
  })
  test(`向函数传对象 -- 数组`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const data = [{a: 1, b: 2}]
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  
  test(`向函数传对象 -- 嵌套对象`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const data = {a: {b: {c: 3}}}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  
  test(`向函数传对象 -- 数组中包含对象`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const data = [{a: 1}, {b: 2}]
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  
  test(`向函数传对象 -- 对象中包含数组`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const data = {a: [1, 2, 3]}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  
  test(`向函数传对象 -- 深层嵌套对象`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const data = {a: {b: {c: {d: 4}}}}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  test(`迭代远程数组 -- 无需知道数组长度时`, async () => {
    const { proxy } = hookToCode(opt)
    const arr = proxy.String(`hello`).split(``)
    const iterator = arr.values()
    let state = await iterator.next();
    let index = -1
    while (!state.done) {
      index = index + 1
      if(state.value === `l`) {
        break
      }
      state = await iterator.next();
    }
    const res = {index, value: state.value}
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual({ index: 2, value: 'l' })
  })
  test(`迭代远程数组 -- 需要知道数组长度时`, async () => {
    const { proxy } = hookToCode(opt)
    const arr = proxy.String(`hello`).split(``)
    const length = await arr.length
    const iterator = arr.values()
    let state = await iterator.next();
    let index = -1
    while (!state.done) {
      index = index + 1
      if(state.value === `l`) {
        break
      }
      state = await iterator.next();
    }
    const res = {index, length, value: state.value}
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual({ index: 2, length: 5, value: 'l' })
  })

  test(`向函数传对象 -- 包含代理对象`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const id = util.guid()
    proxy[id] = 1
    const data = {[id]: proxy[id]}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual({[id]: 1})
  })
  
  test(`向函数传对象 -- 包含嵌套代理对象`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const id = util.guid()
    proxy[id] = {b: 2}
    const data = {[id]: proxy[id]}
    const res = await proxy.Object(data)
    console.log({res})
    await proxy.clear()
    expect(res).toStrictEqual({[id]: {b: 2}})
  })
  
  test(`向函数传对象 -- 包含数组和代理对象`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const id = util.guid()
    proxy[id] = 1
    const data = [proxy[id], 2, 3]
    const res = await proxy.Array.from(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual([1, 2, 3])
  })
  
  test(`向函数传对象 -- 包含嵌套数组和代理对象`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const id = util.guid()
    proxy[id] = {b: 2}
    const data = [proxy[id], {c: 3}]
    const res = await proxy.Array.from(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual([{b: 2}, {c: 3}])
  })
  
  test(`向函数传对象 -- 包含嵌套数组和对象`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const data = [{a: [1, 2]}, {b: [3, 4]}]
    const res = await proxy.Array.from(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  
  test(`向函数传对象 -- 包含嵌套数组和对象及代理对象`, async () => {
    const { proxy, queue } = hookToCode(opt)
    const id = util.guid()
    proxy[id] = {b: 2}
    const data = [{[id]: [proxy[id], 2]}, {b: [3, 4]}]
    const res = await proxy.Array.from(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual([{[id]: [{b: 2}, 2]}, {b: [3, 4]}])
  })
}

/**
 * 单次运行
 * @param {*} opt 
 */
async function onceTest(opt = {}) {
  const sdk = await require(`../sdkPromise.js`)
  opt = util.mergeWithoutUndefined({
    sdk,
  }, opt)
  test(`node.process.env -- 即时取值`, async () => {
    const { proxy } = hookToCode(opt)
    const OS = await proxy.process.env.OS
    const HOMEDRIVE = await proxy.process.env.HOMEDRIVE
    const HOMEPATH = await proxy.process.env.HOMEPATH
    const data1 = {
      OS: process.env.OS,
      HOMEDRIVE: process.env.HOMEDRIVE,
      HOMEPATH: process.env.HOMEPATH,
    }
    const data2 = {
      OS,
      HOMEDRIVE,
      HOMEPATH,
    }
    console.log({data1, data2})
    expect(data1).toStrictEqual(data2)
  })
  test(`获取错误信息 -- 从不存在的属性中读取下级属性`, async () => {
    const { proxy } = hookToCode(opt)
    const OS = await proxy.process.a.b.c.env.OS.catch(String)
    const data1 = {
      OS: `TypeError: Cannot read properties of undefined (reading 'b')`,
    }
    const data2 = {
      OS,
    }
    console.log({data1, data2})
    expect(data1).toStrictEqual(data2)
  })
  test(`向函数传对象 -- 数组`, async () => {
    const { proxy } = hookToCode(opt)
    const data = [{a: 1, b: 2}]
    const res = await proxy.Object(data)
    console.log(res)
    expect(res).toStrictEqual(data) 
  })
  test(`向函数传对象 -- 嵌套对象`, async () => {
    const { proxy } = hookToCode(opt)
    const data = {a: {b: {c: 3}}}
    const res = await proxy.Object(data)
    console.log(res)
    expect(res).toStrictEqual(data)
  })
  test(`向函数传对象 -- 包含嵌套数组和对象及代理对象`, async () => {
    const { proxy } = hookToCode(opt)
    const id = util.guid()
    proxy[id] = {b: 2}
    const data = [{[id]: [proxy[id], 2]}, {b: [3, 4]}]
    const res = await proxy.Array.from(data)
    console.log(res)
    expect(res).toStrictEqual([{[id]: [{b: 2}, 2]}, {b: [3, 4]}])
  })
}

describe(`sdk`, async () => {
  const sdk = await require(`../sdkPromise.js`)
  test(`发送多个参数并接收返回值`, async () => {
    const sendArgs = [[1, 2, 3], 4, 5]
    const code = util.removeLeft(`
      return args  
    `)
    const [resArgs] = await sdk.run([
      {
        code,
        args: sendArgs,
      }
    ])
    expect(sendArgs).toStrictEqual(resArgs)
  })
  test(`指定函数参数`, async () => {
    const sendArgs = [[1, 2, 3], 4, 5]
    const code = util.removeLeft(`
      return sendArgs  
    `)
    const [resArgs] = await sdk.run([
      {
        code,
        args: sendArgs,
        argsName: `sendArgs`,
      }
    ])
    expect(sendArgs).toStrictEqual(resArgs)
  })
  test(`获取错误信息 -- 使用未声明的变量`, async () => {
    const code = util.removeLeft(`
      undeclaredVariablesA
    `)
    const res = await sdk.run([
      {
        code,
      }
    ]).catch(String)
    console.log(res)
    expect(res).toStrictEqual(`ReferenceError: undeclaredVariablesA is not defined`)
  })
}, 10 * 1e3)

describe(`配置项`, async () => {
  const sdk = await require(`../sdkPromise.js`)
  test(`globalNamespace`, async () => {
    const { proxy } = hookToCode({sdk, globalNamespace: `globalThis`})
    const OS = await proxy.process.env.OS
    const __filename = await proxy.__filename
    console.log({OS})
    await proxy.clear()
    expect(OS).toBeTypeOf(`string`)
    && expect(__filename).toBeTypeOf(`object`)
  })
  test(`variablePrefix`, async () => {
    const id = util.guid()
    const { proxy } = hookToCode({sdk, variablePrefix: id})
    // 注意: 故意制造一个错误抛出变量名
    const OS = await proxy.process.env.OS().catch(String)
    await proxy.clear().catch(String)
    expect(OS).includes(id)
  })
  test(`variablePrefix - 带点号`, async () => {
    const id = util.guid()
    const { proxy } = hookToCode({sdk, variablePrefix: `globalThis.${id}`})
    // 注意: 故意制造一个错误抛出变量名
    const OS = await proxy.process.env.OS().catch(String)
    await proxy.clear().catch(String)
    expect(OS).includes(id)
  })
  test(`lib`, async () => {
    const { proxy, jsTool } = hookToCode({lib: [
      `process.env.OS`,
    ]})
    const OS = await proxy.process.env.OS
    const code = jsTool.codeStrTool.getCodeList().join(`\n`)
    console.log({OS, code})
    await proxy.clear()
    expect(code).includes(`process.env.OS`)
  })
  test(`clearKey`, async () => {
    const id = util.guid()
    const { proxy } = hookToCode({
      sdk,
      clearKey: id,
    })
    const OS = await proxy.process.env.OS
    console.log({OS})
    await proxy[id]()
    expect(OS).toBeTypeOf(`string`)
  })
}, 10 * 1e3)
describe(`mainRuner`, async () => {
  await runnerTest({
    runType: `mainRuner`,
  })
}, 10 * 1e3)
describe(`mainRunerOnce`, async () => {
  await onceTest({
    runType: `mainRunerOnce`,
  })
}, 10 * 1e3)
describe(`createRuner`, async () => {
  await runnerTest({
    runType: `createRuner`
  })
}, 10 * 1e3)
describe(`createRunerOnce`, async () => {
  await onceTest({
    runType: `createRunerOnce`,
  })
}, 10 * 1e3)
