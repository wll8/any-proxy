require(`util`).inspect.defaultOptions.depth = 4 // console.log 展开对象

import { describe, expect, test } from 'vitest'
const hookToCode = require(`../hookToCode.js`)

describe(`js`, async () => {
  test(`console.log -- 拆分调用`, async () => {
    const { proxy: node, userData, queue } = hookToCode({
      generateCodeOpt: {
        variableKeyword: ``,
      },
      codeType: `js`,
    })
    node.console.log(`hello`)
    await queue.awaitEnd()
    console.log(userData.info.codeList)
    expect(userData.info.codeList).toStrictEqual([
      'v_1 = console;',
      'v_2 = v_1.log;',
      'v_3 = v_2.apply(v_1, ["hello"])'
    ])
  }, 0)
  test(`console.log -- 作为库调用`, async () => {
    const { proxy: node, userData, queue } = hookToCode({
      generateCodeOpt: {
        lib: [
          `console.log`
        ],
        variableKeyword: ``,
      },
      codeType: `js`,
    })
    node.console.log(`hello`)
    await queue.awaitEnd()
    console.log(userData.info.codeList)
    expect(userData.info.codeList).toStrictEqual([
      'v_1 = console;',
      'v_2 = console.log;',
      'v_3 = v_2.apply(v_1, ["hello"])'
    ])
  }, 0)
  test(`await node.process.env.OS -- 即时取值`, async () => {
    const { proxy: node, userData, queue } = hookToCode({
      generateCodeOpt: {
        lib: [
          `console.log`
        ],
        variableKeyword: ``,
      },
      codeType: `js`,
    })
    const os = await node.process.env.OS
    console.log(os)
    await queue.awaitEnd()
    expect(os).toBeTypeOf(`string`)
  }, 0)
}, 0)