const deasync = require(`deasync`);
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



async function run(cfg) {
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
  console.log(`cfg.code`, cfg.code)
  const fnCode = util.removeLeft(`
    ;((...${cfg.argsName}) => {
      ${transformCode(cfg.code)}
    })(${cfg.args.map(item => JSON.stringify(item)).join(`, `)});`)
  let res = []
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
      res = [
        JSON.parse(JSON.stringify(typeof(resTemp) === `undefined` ? null : resTemp))
      ]
    } catch (error) {
      console.log(error)
    }
    parentPort.postMessage({
      id: cfg.id,
      data: {
        type: `runOk`,
        res,
      },
    });
  } catch (error) {
    parentPort.postMessage({
      id: cfg.id,
      data: {
        type: `runErr`,
        res: String(error)
      },
    });
  }

  /**
   * 将输入的代码转换为函数形式
   * @param {*} input 
   * @returns 
   */
  function transformCode(input) {
    let newStr = input
    
    // 创建正则表达式来匹配形如 "fn_" 开头的字符串
    const fnRegex = /"fn_[a-zA-Z0-9_]+"/g;

    // 使用字符串的 replace 方法，将匹配的内容替换为函数形式
    if(input.match(fnRegex)) {
      newStr = input.replace(fnRegex, match => {
        // 提取标记并去除双引号
        const fnId = match.slice(1, -1);
        
        // 返回替换为箭头函数的模板字符串
        
        return util.removeLeft(`
          (...args) => {
            let done = false;
            let data = undefined;
            ${fnId} = {
              args,
              size: args.length,
              next(res) {
                done = true;
                data = res;
              }
            };
            parentPort.postMessage({
              id: "${cfg.id}",
              data: {
                type: "cbArg",
                res: ["${fnId}"]
              },
            });
            deasync.loopWhile(() => !done);
            delete ${fnId}
            return data;
          }
        `);
      });
      newStr = [
        newStr,
        ``,
      ].join(`\n`)
    }
    console.log(`newStr`, newStr)
    return newStr
  }

}


parentPort.on(`message`, (data) => {
  run(data)
});