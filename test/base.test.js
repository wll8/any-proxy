require(`util`).inspect.defaultOptions.depth = 4 // console.log 展开对象

import { describe, expect, test } from 'vitest'
const hookToCode = require(`../hookToCode.js`)

describe(`sdk`, async () => {
  const sdk = await require(`../sdkPromise.js`)
  test(`发送多个参数并接收返回值`, async () => {
    const sendArgs = [[1, 2, 3], 4, 5]
    const [resArgs] = await sdk.run([
      `
        return args
      `, ...sendArgs
    ])
    expect(sendArgs).toStrictEqual(resArgs)
  })
  test(`获取错误信息 -- 使用未声明的变量`, async () => {
    const res = await sdk.run([
      `
        undeclaredVariablesA
      `
    ]).catch(String)
    console.log(res)
    expect(res).toStrictEqual(`ReferenceError: undeclaredVariablesA is not defined`)
  })
}, 0)

describe(`js`, async () => {
  test(`console.log -- 拆分调用`, async () => {
    const { endClear, proxy: node, userData } = hookToCode()
    node.console.log(`hello`)
    await endClear()
    console.log(userData.info.codeList)
    expect(userData.info.codeList).toStrictEqual([
      'v_1 = console;',
      'v_2 = v_1.log;',
      'v_3 = v_2.apply(v_1, ["hello"])'
    ])
  })
  test(`console.log -- 作为库调用`, async () => {
    const { endClear, proxy: node, userData } = hookToCode({
      generateCodeOpt: {
        lib: [
          `console.log`
        ],
      },
      codeType: `js`,
    })
    node.console.log(`hello`)
    await endClear()
    console.log(userData.info.codeList)
    expect(userData.info.codeList).toStrictEqual([
      'v_1 = console;',
      'v_2 = console.log;',
      'v_3 = v_2.apply(v_1, ["hello"])'
    ])
  })
  test(`node.process.env.OS -- 即时取值`, async () => {
    const { endClear, proxy: node, userData } = hookToCode()
    const os = await node.process.env.OS
    console.log(os)
    await endClear()
    expect(os).toBeTypeOf(`string`)
  })
  test(`msg/process.msg2 全局空间设置和获取值`, async () => {
    const { endClear, proxy: node, userData } = hookToCode()
    node.msg = `msg`
    node.process.msg2 = `msg2`
    const msg = await node.msg
    const msg2 = await node.process.msg2
    await endClear()
    const res = {msg, msg2}
    console.log(res)
    expect(res).toStrictEqual({ msg: 'msg', msg2: 'msg2' })
  })
  test(`node.process.myFile = node.__filename -- 挂载 __filename 到 process.myFile`, async () => {
    const { endClear, proxy: node, userData } = hookToCode()
    node.process.myFile = node.__filename
    const name = await node.process.myFile
    await endClear()
    console.log({name})
    expect(name).toBeTypeOf(`string`)
  })
  test(`fs.statSync(node.process.myFile) -- 函数的参数使用挂载的变量`, async () => {
    const { endClear, proxy: node, userData } = hookToCode()
    node.process.myFile = node.__filename
    const fs = node.require(`fs`)
    const {size} = await fs.statSync(node.process.myFile, `utf8`)
    await endClear()
    console.log({size})
    expect(size).toBeTypeOf(`number`)
  })
  test(`require('fs').statSync -- 函数连续调用并获取返回值的属性`, async () => {
    const { endClear, proxy: node, userData } = hookToCode()
    const size = await node.require(`fs`).statSync(node.__filename, `utf8`).size
    const size2 = await node.require(`fs`).statSync(node.__filename, {
      encoding: `utf8`,
    }).size
    await endClear()
    console.log({size, size2})
    expect(size).toBeTypeOf(`number`)
    expect(size2).toBeTypeOf(`number`)
  })
  test(`赋值、取值、函数调用`, async () => {
    const { endClear, proxy: node, userData, queue } = hookToCode()
    node.msg = `msg`
    node.process.msg2 = `msg2`
    node.process.myFile = node.__filename
    const msg = await node.msg
    const msg2 = await node.process.msg2
    const fs = node.require(`fs`)
    const {size} = await fs.statSync(node.process.myFile, `utf8`)
    const pid = await node.process.pid
    const res = {msg, msg2, sizeType: typeof(size), pidType: typeof(pid)}
    console.log(res)
    await endClear()
    expect(res).toStrictEqual({ msg: 'msg', msg2: 'msg2', sizeType: 'number', pidType: 'number' })
  })
  test(`node.Math.max(node.a, node.b) -- 引用多个远程参数`, async () => {
    const { endClear, proxy: node, userData } = hookToCode()
    node.a = 1
    node.b = 2
    const res = await node.Math.max(node.a, node.b)
    console.log(res)
    await endClear()
    expect(res).toStrictEqual(2)
  })
  test(`node.Array.from([node.a, node.b]) -- 在数组中引用多个远程参数`, async () => {
    const { endClear, proxy: node, userData } = hookToCode()
    node.a = 1
    node.b = 2
    const res = await node.Array.from([node.a, node.b])
    console.log(res)
    await endClear()
    expect(res).toStrictEqual([1, 2])
  })
  test(`node.Array.from([node.a.a, node.b.b]) -- 在数组中引用多个远程参数 -- 对象中取值`, async () => {
    const { endClear, proxy: node, queue } = hookToCode()
    node.a = {a: 1}
    node.b = {b: 2}
    const res = await node.Array.from([node.a.a, node.b.b])
    console.log(res)
    expect(res).toStrictEqual([1, 2])
  })
  test(`使用之前设置的变量`, async () => {
    const { endClear, proxy: node, queue } = hookToCode()
    node.a = 1
    node.b = 2
    const res = await node.Array.from([node.a, node.b])
    console.log(res)
    await endClear()
    const { endClear: endClear2, proxy: node2 } = hookToCode()
    // 还可以再拿到的 a 和 b
    const res2 = await node2.Array.from([node2.a, node2.b])
    console.log(res2)
    await endClear2()
    expect(res2).toStrictEqual([1, 2])
  })
  test(`向函数传对象 -- 对象`, async () => {
    const { endClear, proxy: node, queue } = hookToCode()
    const data = {a: 1, b: 2}
    const res = await node.Object(data)
    console.log(res)
    await endClear()
    expect(res).toStrictEqual(data)
  })
  test(`向函数传对象 -- 对象中包含云端变量`, async () => {
    const { endClear, proxy: node, queue } = hookToCode()
    const max = node.Math.max(1, 2)
    const data = {a: 1, b: 2, max}
    const res = await node.Object(data)
    console.log(res)
    await endClear()
    expect(res).toStrictEqual({
      a: 1, b: 2, max: 2
    })
  })
  test(`向函数传对象 -- 数组`, async () => {
    const { endClear, proxy: node, queue } = hookToCode()
    const data = [{a: 1, b: 2}]
    const res = await node.Object(data)
    console.log(res)
    await endClear()
    expect(res).toStrictEqual(data)
  })
  test(`向函数传字面量 -- 数字`, async () => {
    const { endClear, proxy: node, queue } = hookToCode()
    const res = await node.Math.max(1,2,3)
    console.log(res)
    await endClear()
    expect(res).toStrictEqual(3)
  })
  test(`向函数传字面量 -- 字符串`, async () => {
    const { endClear, proxy: node, queue } = hookToCode()
    const data = `hello`
    const res = await node.String(data)
    console.log(res)
    await endClear()
    expect(res).toStrictEqual(data)
  })
  test(`readme 中的 demo`, async () => {
    const { endClear, proxy: node } = hookToCode()
    
    node.a = 1
    node.b = 2
    const res = await node.Math.max(node.a, node.b)
    await endClear()
    expect(res).toStrictEqual(2)
  })
  test(`解构`, async () => {
    const { endClear, proxy: node } = hookToCode()
    const { Math } = node
    let {globalThis: {a, b}} = node
    a = 1
    b = 2
    node.c = 3
    const res = await Math.max(a, b, node.c)
    await endClear()
    expect(res).toStrictEqual(3)
  })
  test(`获取错误信息 -- 读取一个未声明的变量应抛出错误 -- 在 Math.max 和 endClear 中获取错误`, async () => {
    const { endClear, proxy: node } = hookToCode()
    const { Math } = node
    let {undeclaredVariablesA, undeclaredVariablesB} = node
    const res = await Math.max(undeclaredVariablesA, undeclaredVariablesB).catch(String)
    console.log(res)
    await endClear().catch(String)
    expect(res).toStrictEqual(`Error: ReferenceError: undeclaredVariablesA is not defined`)
  })
  test(`获取错误信息 -- 读取一个未声明的变量应抛出错误 -- 在 catch 例如 endClear 中获取错误(由于异步实现, 不能即时获取错误)`, async () => {
    const { endClear, proxy: node } = hookToCode()
    let {undeclaredVariablesA, undeclaredVariablesB} = node
    const res = await endClear().catch(String)
    console.log(res)
    expect(res).toStrictEqual(`Error: ReferenceError: undeclaredVariablesA is not defined`)
  })
  test(`获取错误信息 -- 调用不存在的方法, 在 endClear 中获取之前未捕获的错误`, async () => {
    const { endClear, proxy: node } = hookToCode()
    node.a.b.c()
    const res = await endClear().catch(String)
    console.log(res)
    expect(res).toStrictEqual(`Error: TypeError: Cannot read properties of undefined (reading 'c')`)
  })
  test(`获取错误信息 -- 调用不存在的方法, 在 endClear 中也抛出同样的错误`, async () => {
    const err = `Error: TypeError: Cannot read properties of undefined (reading 'c')`
    const { endClear, proxy: node } = hookToCode()
    const res1 = await node.a.b.c().catch(String)
    const res2 = await endClear().catch(String)
    console.log(res1, res2)
    expect(res1).toStrictEqual(err)
    && expect(res2).toStrictEqual(err)
  })
}, 0)