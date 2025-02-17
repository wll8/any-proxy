# any-proxy

Transform or execute remote code via proxy.


## Why

If you have a server-side service and want to call certain APIs on the client side, you might initially use RPC to create a method for each API for client-side invocation. As the number of APIs grows, this becomes tedious and time-consuming.

Now, you can use a proxy in the client to represent the server environment. All methods called through the proxy run as if they were executed on the server.


For example, if you want to run the following code on the server to get the largest number:

``` js
a = 1
b = 2
Math.max(a, b)
```

You can use it like this:

``` js
const { proxy } = anyHook(opt)

proxy.a = 1
proxy.b = 2
const res = await proxy.Math.max(proxy.a, proxy.b)
expect(res).toStrictEqual(2)
```

Function calls, assignments, and other operations on the proxy object are sent to the remote server for execution. If you need to retrieve the result, use `await`.

Why does it work this way? Because it internally transforms the proxy into server-side code and runs it in the server environment, so you need to pay attention to server security, such as limiting the execution scope using a VM.

## Features

- Supports assignment, value retrieval, function calls, and callbacks
- Supports logical continuity, not just single function calls
- Supports custom global execution space
- Supports referencing remote variables
- Supports custom transformers


## Custom Execution

Customize the `run` function in the SDK to implement a custom execution process and return the result.

``` js
const { anyHook } = require(`any-hook`)

new Promise(async () => {
  const { proxy } = anyHook({
    toolOpt: {
      sdk: {
        async run([opt], ctx) {
          return new Promise((resolve, reject) => {
            console.log(`run`, opt)
            resolve([`res`])
          })
        }
      }
    },
  })
  const fs = proxy.require(`fs`)
  const list = await fs.readdirSync(`./`)
  console.log({list})
})
```

If you need to write code in other languages, such as Python, within JavaScript, you may need to refer to the `server/index.js` file to add the execution environment in Python.

## Custom Code Transformation

`anyHook` supports passing a `tool` function to customize the transformation process:

``` js
anyHook({
  tool(){}, // Write transformation logic here
  toolOpt: {},
})
```

You can refer to the `to.js.js` file, which implements the transformation of proxies into JavaScript code.

## Development

``` sh
# Install dependencies
pnpm i

# Run the RPC service
pnpm run server

# Run test cases
pnpm run test
```

## License

MIT