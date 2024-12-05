require(`util`).inspect.defaultOptions.depth = 4 // console.log 展开对象

import { describe, expect, test } from 'vitest'
const hookToCode = require(`../hookToCode.js`)

describe(`js`, async () => {
  test(`console.log -- 拆分调用`, async () => {
    const { proxy: node, userData } = hookToCode({
      codeType: `js`,
    })
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
    const { proxy: node, userData } = hookToCode({
      codeType: `js`,
    })
    const [os] = await node.process.env.OS
    console.log(os)
    await node.awaitEnd()
    expect(os).toBeTypeOf(`string`)
  })
  test(`msg/process.msg2 全局空间设置和获取值`, async () => {
    const { proxy: node, userData } = hookToCode({
      codeType: `js`,
    })
    node.msg = `msg`
    node.process.msg2 = `msg2`
    const [msg] = await node.msg
    const [msg2] = await node.process.msg2
    await node.awaitEnd()
    const res = {msg, msg2}
    console.log(res)
    expect(res).toStrictEqual({ msg: 'msg', msg2: 'msg2' })
  })
  test(`node.process.myFile = node.__filename -- 挂载 __filename 到 process.myFile`, async () => {
    const { proxy: node, userData } = hookToCode({
      codeType: `js`,
    })
    node.process.myFile = node.__filename
    const [name] = await node.process.myFile
    await node.awaitEnd()
    console.log({name})
    expect(name).toBeTypeOf(`string`)
  })
  test(`fs.statSync(node.process.myFile) -- 函数的参数使用挂载的变量`, async () => {
    const { proxy: node, userData } = hookToCode({
      codeType: `js`,
    })
    node.process.myFile = node.__filename
    const fs = node.require(`fs`)
    const [{size}] = await fs.statSync(node.process.myFile, `utf8`)
    await node.awaitEnd()
    console.log({size})
    expect(size).toBeTypeOf(`number`)
  })
  test(`require('fs').statSync -- 函数连续调用并获取返回值的属性`, async () => {
    const { proxy: node, userData } = hookToCode({
      codeType: `js`,
    })
    const [size] = await node.require(`fs`).statSync(node.__filename, `utf8`).size
    const [size2] = await node.require(`fs`).statSync(node.__filename, {
      encoding: `utf8`,
    }).size
    await node.awaitEnd()
    console.log({size, size2})
    expect(size).toBeTypeOf(`number`)
    expect(size2).toBeTypeOf(`number`)
  })
  test(`赋值、取值、函数调用`, async () => {
    const { proxy: node, userData, queue } = hookToCode({
      codeType: `js`,
    })
    node.msg = `msg`
    node.process.msg2 = `msg2`
    node.process.myFile = node.__filename
    const [msg] = await node.msg
    const [msg2] = await node.process.msg2
    const fs = node.require(`fs`)
    const [{size}] = await fs.statSync(node.process.myFile, `utf8`)
    const [pid] = await node.process.pid
    const res = {msg, msg2, sizeType: typeof(size), pidType: typeof(pid)}
    console.log(res)
    await node.awaitEnd()
    expect(res).toStrictEqual({ msg: 'msg', msg2: 'msg2', sizeType: 'number', pidType: 'number' })
  })
  test(`node.Math.max(node.a, node.b) -- 引用多个远程参数`, async () => {
    const { proxy: node, userData } = hookToCode({
      codeType: `js`,
    })
    node.a = 1
    node.b = 2
    const [res] = await node.Math.max(node.a, node.b)
    console.log(res)
    await node.awaitEnd()
    expect(res).toStrictEqual(2)
  })
  test.todo(`node.Math.from([node.a, node.b]) -- 在数组中引用多个远程参数`, async () => {
    const { proxy: node, userData } = hookToCode({
      codeType: `js`,
    })
    node.a = 1
    node.b = 2
    const [res] = await node.Array.from([node.a, node.b])
    console.log(res)
    await node.awaitEnd()
    expect(res).toStrictEqual([1, 2])
  })
  test.todo(`不清除变量`, async () => {
    const { proxy: node, userData } = hookToCode({
      codeType: `js`,
    })
    node.a = 1
    node.b = 2
    await node.awaitEnd()
    // expect(size).toBeTypeOf(`number`)
  })
}, 0)