# hook-run

通过 hook 运行远程代码。

假设你已经有了一个 nodejs rpc 服务，想在服务器上运行以下代码获取最大的那个数:

``` js
a = 1
b = 2
Math.max(a, b)
```

那么你可以这么使用:

``` js
const hookRun = require(`hook-run`)
const { proxy: node } = hookRun()

node.a = 1
node.b = 2
const res = await node.Math.max(node.a, node.b)
expect(res).toStrictEqual(2)
```

可以看到，proxy 对象上的函数调用、赋值等操作都会被发送到远程运行。如果你需要获取运行结果，则使用 await 获取。

注意: `node.a = 1` 等于 `a = 1` ， 由于需要保持变量持续性，所以没有使用变量声明关键词(例如 var/let 这些)。

## 开发

``` sh
# 安装依赖
pnpm i

# 运行 rpc 服务
npx mm

# 运行测试用例
pnpm test
```