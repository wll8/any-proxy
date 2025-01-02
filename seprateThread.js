const { parentPort } = require(`worker_threads`);
const {VM} = require('vm2');
const util = require('./util.js');

/**
 * 获取虚拟机
 * @returns 
 */
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

/**
 * 运行单例虚拟机
 */
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
 * 动态运行 js
 * @param {*} wsId 
 * @param {*} obj 
 */
async function run(wsId, obj) {
  // todo fnArgs 中应支持使用参数名和参数值
  let [cfg] = obj.params
  cfg = util.mergeWithoutUndefined({
    // 运行类型
    runType: `mainRuner`,
    // 函数内代码
    code: ``,
    // 函数的参数
    args: [],
    // 函数的参数名
    argsName: `args`,
  }, cfg)
  console.log(cfg.code)
  const fnCode = util.removeLeft(`
    ;((...${cfg.argsName}) => {
      ${cfg.code}
    })(${cfg.args.map(item => JSON.stringify(item)).join(`, `)});`)
  const resObj = {
    err: undefined,
    res: [],
  }
  try {
    const tab = {
      /**
       * 在宿主中运行
       * @returns 
       */
      main: () => {
        return eval(fnCode)
      },
      /**
       * 在 vm 中运行
       * @returns 
       */
      vm: (vm) => {
        const res = vm.run(`
          eval(${JSON.stringify(fnCode)})
        `)
        return res
      },
    }
    let resTemp = undefined
    if([`mainRuner`, `mainRunerOnce`].includes(cfg.runType)) {
      resTemp = tab.main()
    } else if([`createRuner`].includes(cfg.runType)) {
      resTemp = tab.vm(vmRuner.getVm())
    } else if([`createRunerOnce`].includes(cfg.runType)) {
      resTemp = tab.vm(getVm())
    }
    try {
      resObj.res = [
        JSON.parse(JSON.stringify(typeof(resTemp) === `undefined` ? null : resTemp))
      ]
    } catch (error) {
      console.log(error)
    }
  } catch (error) {
    resObj.err = String(error)
  }
  parentPort.postMessage({
    type: `send`,
    id: obj.id,
    wsId,
    resObj,
  });
}


parentPort.on(`message`, (data) => {
  if(data.type === `run`) {
    run(data.wsId, data.obj)
  }
});