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
  const sdk = await require(`../sdkPromise.js`)
  test(`proxy.process.env.OS -- 即时取值`, async () => {
    const { proxy } = hookToCode({sdk})
    const os = await proxy.process.env.OS
    console.log(os)
    await proxy.clear()
    expect(os).toBeTypeOf(`string`)
  })
  test(`msg/process.msg2 全局空间设置和获取值`, async () => {
    const { proxy, userData } = hookToCode({sdk})
    proxy.msg = `msg`
    proxy.process.msg2 = `msg2`
    const msg = await proxy.msg
    const msg2 = await proxy.process.msg2
    await proxy.clear()
    const res = {msg, msg2}
    console.log(res)
    expect(res).toStrictEqual({ msg: 'msg', msg2: 'msg2' })
  })
  test(`proxy.process.myFile = proxy.__filename -- 挂载 __filename 到 process.myFile`, async () => {
    const { proxy, userData } = hookToCode({sdk})
    proxy.process.myFile = proxy.__filename
    const name = await proxy.process.myFile
    await proxy.clear()
    console.log({name})
    expect(name).toBeTypeOf(`string`)
  })
  test(`fs.statSync(proxy.process.myFile) -- 函数的参数使用挂载的变量`, async () => {
    const { proxy, userData } = hookToCode({sdk})
    proxy.process.myFile = proxy.__filename
    const fs = proxy.require(`fs`)
    const {size} = await fs.statSync(proxy.process.myFile, `utf8`)
    await proxy.clear()
    console.log({size})
    expect(size).toBeTypeOf(`number`)
  })
  test(`require('fs').statSync -- 函数连续调用并获取返回值的属性`, async () => {
    const { proxy, userData } = hookToCode({sdk})
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
    const { proxy, userData, queue } = hookToCode({sdk})
    proxy.msg = `msg`
    proxy.process.msg2 = `msg2`
    proxy.process.myFile = proxy.__filename
    const msg = await proxy.msg
    const msg2 = await proxy.process.msg2
    const fs = proxy.require(`fs`)
    const {size} = await fs.statSync(proxy.process.myFile, `utf8`)
    const pid = await proxy.process.pid
    const res = {msg, msg2, sizeType: typeof(size), pidType: typeof(pid)}
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual({ msg: 'msg', msg2: 'msg2', sizeType: 'number', pidType: 'number' })
  })
  test(`proxy.Math.max(proxy.a, proxy.b) -- 引用多个远程参数`, async () => {
    const { proxy, userData } = hookToCode({sdk})
    proxy.a = 1
    proxy.b = 2
    const res = await proxy.Math.max(proxy.a, proxy.b)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(2)
  })
  test(`proxy.Array.from([proxy.a, proxy.b]) -- 在数组中引用多个远程参数`, async () => {
    const { proxy, userData } = hookToCode({sdk})
    proxy.a = 1
    proxy.b = 2
    const res = await proxy.Array.from([proxy.a, proxy.b])
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual([1, 2])
  })
  test(`proxy.Array.from([proxy.a.a, proxy.b.b]) -- 在数组中引用多个远程参数 -- 对象中取值`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    proxy.a = {a: 1}
    proxy.b = {b: 2}
    const res = await proxy.Array.from([proxy.a.a, proxy.b.b])
    console.log(res)
    expect(res).toStrictEqual([1, 2])
  })
  test(`使用之前设置的变量`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    proxy.a = 1
    proxy.b = 2
    const res = await proxy.Array.from([proxy.a, proxy.b])
    console.log(res)
    await proxy.clear()
    const { proxy: proxy2 } = hookToCode({sdk})
    // 还可以再拿到的 a 和 b
    const res2 = await proxy2.Array.from([proxy2.a, proxy2.b])
    console.log(res2)
    await proxy.clear()
    expect(res2).toStrictEqual([1, 2])
  })
  test(`readme 中的 demo`, async () => {
    const { proxy } = hookToCode({sdk})
    
    proxy.a = 1
    proxy.b = 2
    const res = await proxy.Math.max(proxy.a, proxy.b)
    await proxy.clear()
    expect(res).toStrictEqual(2)
  })
  test(`解构`, async () => {
    const { proxy } = hookToCode({sdk})
    const { Math } = proxy
    let {globalThis: {a, b}} = proxy
    a = 1
    b = 2
    proxy.c = 3
    const res = await Math.max(a, b, proxy.c)
    await proxy.clear()
    expect(res).toStrictEqual(3)
  })
  test(`获取错误信息 -- 读取一个未声明的变量应抛出错误 -- 在 Math.max 和 clear 中获取错误`, async () => {
    const { proxy } = hookToCode({sdk})
    const { Math } = proxy
    let {undeclaredVariablesA, undeclaredVariablesB} = proxy
    const res = await Math.max(undeclaredVariablesA, undeclaredVariablesB).catch(String)
    console.log(res)
    await proxy.clear().catch(String)
    expect(res).toStrictEqual(`ReferenceError: undeclaredVariablesA is not defined`)
  })
  test(`获取错误信息 -- 读取一个未声明的变量应抛出错误 -- 在 catch 例如 clear 中获取错误(由于异步实现, 不能即时获取错误)`, async () => {
    const { proxy } = hookToCode({sdk})
    let {undeclaredVariablesA, undeclaredVariablesB} = proxy
    const res = await proxy.clear().catch(String)
    console.log(res)
    expect(res).toStrictEqual(`ReferenceError: undeclaredVariablesA is not defined`)
  })
  test(`获取错误信息 -- 调用不存在的方法, 在 clear 中获取之前未捕获的错误`, async () => {
    const { proxy } = hookToCode({sdk})
    proxy.a.b.c()
    const res = await proxy.clear().catch(String)
    console.log(res)
    expect(res).toStrictEqual(`TypeError: Cannot read properties of undefined (reading 'c')`)
  })
  test(`获取错误信息 -- 调用不存在的方法, 在 clear 中也抛出同样的错误`, async () => {
    const err = `TypeError: Cannot read properties of undefined (reading 'c')`
    const { proxy } = hookToCode({sdk})
    const res1 = await proxy.a.b.c().catch(String)
    const res2 = await proxy.clear().catch(String)
    console.log(res1, res2)
    expect(res1).toStrictEqual(err)
    && expect(res2).toStrictEqual(err)
  })
  test(`当返回值为 undefined 时收到的是 null -- 因为 json 不支持 undefined`, async () => {
    const { proxy } = hookToCode({sdk})
    const res = await proxy.console.log(`hello`)
    console.log(res)
    await proxy.clear()
    expect(res).toBe(null)
  })
  test(`向函数传字面量 -- 数字`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    const res = await proxy.Math.max(1,2,3)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(3)
  })
  test(`向函数传字面量 -- 字符串`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    const data = `hello`
    const res = await proxy.String(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  test(`向函数传字面量 -- 布尔值`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    const res = await proxy.Boolean(true)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(true)
  })
  
  test(`向函数传字面量 -- null`, async () => {
    const { proxy, queue, userData } = hookToCode({sdk})
    const arr = proxy.Array()
    arr.push(null)
    const res = await arr
    await proxy.clear()
    console.log(res)
    expect(res).toStrictEqual([null])
  })
  
  test(`向函数传字面量 -- undefined`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    const arr = proxy.Array()
    arr.push(undefined)
    const res = await arr
    await proxy.clear()
    console.log(res)
    expect(res).toStrictEqual([null])
  })
  test(`向函数传对象 -- 对象`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    const data = {a: 1, b: 2}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  test(`向函数传对象 -- 对象中包含代理的方法调用`, async () => {
    const { proxy, queue } = hookToCode({sdk})
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
    const { proxy, queue } = hookToCode({sdk})
    const data = [{a: 1, b: 2}]
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  
  test(`向函数传对象 -- 嵌套对象`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    const data = {a: {b: {c: 3}}}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  
  test(`向函数传对象 -- 数组中包含对象`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    const data = [{a: 1}, {b: 2}]
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  
  test(`向函数传对象 -- 对象中包含数组`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    const data = {a: [1, 2, 3]}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  
  test(`向函数传对象 -- 深层嵌套对象`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    const data = {a: {b: {c: {d: 4}}}}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  
  test.todo(`向函数传对象 -- 包含函数`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    const func = () => 42
    const data = {a: func}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res.a()).toStrictEqual(42)
  })
  
  test(`向函数传对象 -- 包含代理对象`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    proxy.a = 1
    const data = {a: proxy.a}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual({a: 1})
  })
  
  test(`向函数传对象 -- 包含嵌套代理对象`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    proxy.a = {b: 2}
    const data = {a: proxy.a}
    const res = await proxy.Object(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual({a: {b: 2}})
  })
  
  test(`向函数传对象 -- 包含数组和代理对象`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    proxy.a = 1
    const data = [proxy.a, 2, 3]
    const res = await proxy.Array.from(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual([1, 2, 3])
  })
  
  test(`向函数传对象 -- 包含嵌套数组和代理对象`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    proxy.a = {b: 2}
    const data = [proxy.a, {c: 3}]
    const res = await proxy.Array.from(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual([{b: 2}, {c: 3}])
  })
  
  test(`向函数传对象 -- 包含嵌套数组和对象`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    const data = [{a: [1, 2]}, {b: [3, 4]}]
    const res = await proxy.Array.from(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual(data)
  })
  
  test(`向函数传对象 -- 包含嵌套数组和对象及代理对象`, async () => {
    const { proxy, queue } = hookToCode({sdk})
    proxy.a = {b: 2}
    const data = [{a: [proxy.a, 2]}, {b: [3, 4]}]
    const res = await proxy.Array.from(data)
    console.log(res)
    await proxy.clear()
    expect(res).toStrictEqual([{a: [{b: 2}, 2]}, {b: [3, 4]}])
  })
}, 0)

