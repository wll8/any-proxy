import { describe, expect, test } from 'vitest'
const anyProxy = require(`../`)

describe(`use`, async () => {
  test(`sdk`, async () => {
    const { proxy } = anyProxy.anyHook({
      toolOpt: {
        sdk: {
          async run([opt], ctx) {
            return new Promise((resolve, reject) => {
              resolve([`res`])
            })
          }
        }
      },
    })
    const fs = proxy.require(`fs`)
    const res = await fs.readdirSync(`./`)
    expect(res).toStrictEqual(`res`)
  })
}, 10 * 1e3)
