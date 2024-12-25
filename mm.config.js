const {VM} = require('vm2');
const getVm = () => {
  const vm = new VM({
    require: {
      external: true,
      builtin: `*`,
    },
    sandbox: {
      process,
      require,
      __filename,
    },
  });
  return vm
}

// 单例对象
const vmRuner = (function() {
  let instance; // 用于存储单例实例
  let vm = getVm()
  function init() {
    // 单例对象的私有变量和方法
    return {
      run: function(code) {
        try {
          return vm.run(code)
        } catch (error) {
          vm = getVm()
          throw error
        }
      },
    };
  }

  return {
    // 获取单例实例的方法
    getVm: function() {
      if (!instance) {
        instance = init();
      }
      return instance;
    }
  };
})();

/**
 * @see: https://www.hongqiye.com/doc/mockm/config/option.html
 * @type {import('mockm/@types/config').Config}
 */
module.exports = util => {
  return {
    port: 10005,
    testPort: 10006,
    replayPort: 10007,
    api: {
      'ws /rpc'(ws, req) {
        ws.on('message', (msg) => {
          const obj = JSON.parse(msg)
          if (obj.method === `run`) {
            run(ws, obj)
          }
        })
        ws.on(`close`, () => { })
      }
    },
  }
}

/**
 * 动态运行 js
 * @param {*} ws 
 * @param {*} obj 
 */
async function run(ws, obj) {
  // todo fnArgs 中应支持使用参数名和参数值
  const [fnStr, fnArgs = [], cfg = {
    runType: `mainRuner`
  }] = obj.params
  console.log(`fnStr`, fnStr)

  let res = undefined
  let err = undefined
  try {
    const tab = {
      /**
       * 在宿主中运行
       * @returns 
       */
      main: () => {
        const js = `;((...args) => {${fnStr}})(${fnArgs.map(item => JSON.stringify(item)).join(`, `)});`
        return eval(js)
      },
      /**
       * 在 vm 中运行
       * @returns 
       */
      createRuner: (vm) => {
        const js = `;((...args) => {${fnStr}})(${fnArgs.map(item => JSON.stringify(item)).join(`, `)});`
        const res = vm.run(`
          eval(${JSON.stringify(js)})
        `)
        return res
      },
      /**
       * 在临时 vm 中运行
       * @returns 
       */
      createRunerOnce: (vm) => {
        const js = `;((...args) => {${fnStr}})(${fnArgs.map(item => JSON.stringify(item)).join(`, `)});`
        const res = vm.run(`
          eval(${JSON.stringify(js)})
        `)
        return res
      },
    }
    let resObj = undefined
    if([`mainRuner`, `mainRunerOnce`].includes(cfg.runType)) {
      resObj = tab.main()
    } else if([`createRuner`].includes(cfg.runType)) {
      resObj = tab.createRuner(vmRuner.getVm())
    } else if([`createRunerOnce`].includes(cfg.runType)) {
      resObj = tab.createRuner(getVm())
    }
    res = JSON.parse(JSON.stringify(typeof(resObj) === `undefined` ? null : resObj))
  } catch (error) {
    err = String(error)
  }
  const str = JSON.stringify({
    id: obj.id,
    jsonrpc: `2.0`,
    result: [err, res]
  })
  ws.send(str)
}
