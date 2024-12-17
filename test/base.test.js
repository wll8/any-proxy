require(`util`).inspect.defaultOptions.depth = 4 // console.log 展开对象

import { describe, expect, test } from 'vitest'
const hookToCode = require(`../hookToCode.js`)

describe(`js`, async () => {
  test(`console.log -- 拆分调用`, async () => {
    const { proxy: node, userData } = hookToCode()
    node.console.log(`hello`)
    await node.awaitEnd()
    console.log(userData.info.codeList)
    expect(userData.info.codeList).toStrictEqual([
      'v_1 = console;',
      'v_2 = v_1.log;',
      'v_3 = v_2.apply(v_1, ["hello"])'
    ])
  })
  test(`console.log -- 作为库调用`, async () => {
    const { proxy: node, userData } = hookToCode({
      generateCodeOpt: {
        lib: [
          `console.log`
        ],
      },
      codeType: `js`,
    })
    node.console.log(`hello`)
    await node.awaitEnd()
    console.log(userData.info.codeList)
    expect(userData.info.codeList).toStrictEqual([
      'v_1 = console;',
      'v_2 = console.log;',
      'v_3 = v_2.apply(v_1, ["hello"])'
    ])
  })
  test(`node.process.env.OS -- 即时取值`, async () => {
    const { proxy: node, userData } = hookToCode()
    const os = await node.process.env.OS
    console.log(os)
    await node.awaitEnd()
    expect(os).toBeTypeOf(`string`)
  })
  test(`msg/process.msg2 全局空间设置和获取值`, async () => {
    const { proxy: node, userData } = hookToCode()
    node.msg = `msg`
    node.process.msg2 = `msg2`
    const msg = await node.msg
    const msg2 = await node.process.msg2
    await node.awaitEnd()
    const res = {msg, msg2}
    console.log(res)
    expect(res).toStrictEqual({ msg: 'msg', msg2: 'msg2' })
  })
  test(`node.process.myFile = node.__filename -- 挂载 __filename 到 process.myFile`, async () => {
    const { proxy: node, userData } = hookToCode()
    node.process.myFile = node.__filename
    const name = await node.process.myFile
    await node.awaitEnd()
    console.log({name})
    expect(name).toBeTypeOf(`string`)
  })
  test(`fs.statSync(node.process.myFile) -- 函数的参数使用挂载的变量`, async () => {
    const { proxy: node, userData } = hookToCode()
    node.process.myFile = node.__filename
    const fs = node.require(`fs`)
    const {size} = await fs.statSync(node.process.myFile, `utf8`)
    await node.awaitEnd()
    console.log({size})
    expect(size).toBeTypeOf(`number`)
  })
  test(`require('fs').statSync -- 函数连续调用并获取返回值的属性`, async () => {
    const { proxy: node, userData } = hookToCode()
    const size = await node.require(`fs`).statSync(node.__filename, `utf8`).size
    const size2 = await node.require(`fs`).statSync(node.__filename, {
      encoding: `utf8`,
    }).size
    await node.awaitEnd()
    console.log({size, size2})
    expect(size).toBeTypeOf(`number`)
    expect(size2).toBeTypeOf(`number`)
  })
  test(`赋值、取值、函数调用`, async () => {
    const { proxy: node, userData, queue } = hookToCode()
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
    await node.awaitEnd()
    expect(res).toStrictEqual({ msg: 'msg', msg2: 'msg2', sizeType: 'number', pidType: 'number' })
  })
  test(`node.Math.max(node.a, node.b) -- 引用多个远程参数`, async () => {
    const { proxy: node, userData } = hookToCode()
    node.a = 1
    node.b = 2
    const res = await node.Math.max(node.a, node.b)
    console.log(res)
    await node.awaitEnd()
    expect(res).toStrictEqual(2)
  })
  test(`node.Array.from([node.a, node.b]) -- 在数组中引用多个远程参数`, async () => {
    const { proxy: node, userData } = hookToCode()
    node.a = 1
    node.b = 2
    const res = await node.Array.from([node.a, node.b])
    console.log(res)
    await node.awaitEnd()
    expect(res).toStrictEqual([1, 2])
  })
  test(`node.Array.from([node.a.a, node.b.b]) -- 在数组中引用多个远程参数 -- 对象中取值`, async () => {
    const { proxy: node, queue } = hookToCode()
    node.a = {a: 1}
    node.b = {b: 2}
    const res = await node.Array.from([node.a.a, node.b.b])
    console.log(res)
    expect(res).toStrictEqual([1, 2])
  })
  test(`使用之前设置的变量`, async () => {
    const { proxy: node, queue } = hookToCode()
    node.a = 1
    node.b = 2
    const res = await node.Array.from([node.a, node.b])
    console.log(res)
    await node.awaitEnd()
    const { proxy: node2 } = hookToCode()
    // 还可以再拿到的 a 和 b
    const res2 = await node2.Array.from([node2.a, node2.b])
    console.log(res2)
    expect(res2).toStrictEqual([1, 2])
  })
  test(`向函数传对象 -- 对象`, async () => {
    const { proxy: node, queue } = hookToCode()
    const data = {a: 1, b: 2}
    const res = await node.Object(data)
    console.log(res)
    await node.awaitEnd()
    expect(res).toStrictEqual(data)
  })
  test(`向函数传对象 -- 对象中包含云端变量`, async () => {
    const { proxy: node, queue } = hookToCode()
    const max = node.Math.max(1, 2)
    const data = {a: 1, b: 2, max}
    const res = await node.Object(data)
    console.log(res)
    await node.awaitEnd()
    expect(res).toStrictEqual({
      a: 1, b: 2, max: 2
    })
  })
  test(`向函数传对象 -- 数组`, async () => {
    const { proxy: node, queue } = hookToCode()
    const data = [{a: 1, b: 2}]
    const res = await node.Object(data)
    console.log(res)
    await node.awaitEnd()
    expect(res).toStrictEqual(data)
  })
  test(`向函数传字面量 -- 数字`, async () => {
    const { proxy: node, queue } = hookToCode()
    const res = await node.Math.max(1,2,3)
    console.log(res)
    await node.awaitEnd()
    expect(res).toStrictEqual(3)
  })
  test(`向函数传字面量 -- 字符串`, async () => {
    const { proxy: node, queue } = hookToCode()
    const data = `hello`
    const res = await node.String(data)
    console.log(res)
    await node.awaitEnd()
    expect(res).toStrictEqual(data)
  })
  test(`demo`, async () => {
    const { proxy: node } = hookToCode()
    
    node.a = 1
    node.b = 2
    const res = await node.Math.max(node.a, node.b)
    expect(res).toStrictEqual(2)
  })
}, 0)