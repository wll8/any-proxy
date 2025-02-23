const util = require('./util.js')

function getPath(id, list) {
  const path = [];
  let currentId = id;

  // 使用一个 Map 来提升查找效率
  const idMap = new Map(list.map(item => [item.id, item]));

  while (currentId) {
    const currentItem = idMap.get(currentId);
    if (!currentItem) break;  // 如果找不到当前 id，则结束循环

    path.unshift(currentItem);  // 将当前 ID 添加到路径
    currentId = currentItem.parent;  // 更新 currentId 为它的父节点
  }

  return path;  // 返回从目标 id 到根的路径
}

/**
 * 工具函数
 */
function tool(config) {
  config = util.mergeWithoutUndefined({
    proxyTag: ``,
    fnTag: ``,
    /**
     * 自动生成的中间变量名前缀
     */
    variablePrefix: `v`,
    /**
     * 全局命名空间
     * 比如设置 globalNamespace 为 window 时
     * proxy.id = 1 将转换为 window.id = 1
     */
    globalNamespace: ``,
    variableKeyword: ``,
    lib: [],
    sdk: {
      async run(...args) {
        return args
      }
    },
    runType: `mainRuner`,
  }, config)

  /**
   * 存储 ID 到函数的映射
   */
  const idToFunction = {}

  /**
   * 存储 ID 到变量名的映射
   */
  const idToVarName = {};
  /**
   * 存储 ID 到路径的映射
   */
  const idToFullPath = {};
  /**
   * 匹配以 _ 开头后跟数字的字符串
   */
  const variableRegExp = new RegExp(`${config.variablePrefix}_[0-9]+`, `gm`);

  /**
   * 保存传入的 dataListItem
   */
  let dataList = [];
  /**
   * 保存生成的代码
   */
  let codeList = [];

  /**
   * 将 dataListItem 转换为代码片段
   * @param {*} item 
   * @returns 
   */
  function* hookDataList2CodeListByYield(item) {
    dataList.push(item)
    const generateVarName = (id) => `${config.variablePrefix}${id}`;
    const { type, id, parent, key, thisArgId, args, value } = item;

    const varName = generateVarName(id);
    idToVarName[id] = varName;
    const prefix = parent 
      ? `${idToVarName[parent]}.` 
      : config.globalNamespace ?
        `${config.globalNamespace}.` 
        : ``;

    // 递归转换代理标记为变量名
    function replaceProxyTag(args) {
      const re = new RegExp(`"${config.proxyTag}(_[0-9]+)"`, `gm`)
      let str = JSON.stringify(args, (key, item) => {
        const itemType = util.isType(item)
        let newItem = item
        if([`asyncfunction`, `function`].includes(itemType)) {
          const fnId = `${config.fnTag}_${prefix.replace(/[\.\[\]]/g, `_`)}${util.guid()}`
          idToFunction[fnId] = item
          newItem = fnId
        }
        return newItem
      });
      str = str.replace(re, `${config.variablePrefix}$1`)
      return str
    }
        
        
    const typeObj = {
      'get'() {
        const fullPath = util.replaceIdsWithKeys(getPath(id, dataList).map(item => item.key).filter(item => {
          return typeof(item) !== `undefined`
        }).join(`.`))
        idToFullPath[id] = fullPath;
        if (config.lib.includes(idToFullPath[id])) {
          codeList.push(`${config.variableKeyword} ${varName} = ${idToFullPath[id]};`.trim())
        } else {
          codeList.push(`${config.variableKeyword} ${varName} = ${util.replaceIdsWithKeys(`${prefix}${key}`)};`.trim())
        }
      },
      'apply'() {
        const thisArg = thisArgId ? idToVarName[thisArgId] : 'null';
        
        const evalArgs = replaceProxyTag(args);
        codeList.push([
          `${config.variableKeyword} ${varName} = ${prefix}apply(${thisArg}, ${evalArgs});`.trim(),
        ].join(`\n`))
      },
      'set'() {
        const setKey = util.replaceIdsWithKeys(`${prefix}${key}`);
        const evalArgs = replaceProxyTag(value);
        codeList.push(`${setKey} = ${evalArgs};`)
      },
    }
    typeObj[type] && typeObj[type]()
  
    return codeList
  }

  /**
   * 对已有的代码进行静态操作
   */
  class CodeStrTool {
    /**
     * 获取某一行的返回值
     * @param {*} parent 
     * @returns 
     */
    getReturnCode (parent) {
      const line = codeList.at(-1)
      const varName = this.getVarName(line)
      const parentVarName = `${config.variablePrefix}${parent}`
      const snedLine = parentVarName === varName ? `return ${varName};` : `return ${parentVarName};`
      return snedLine
    }
    /**
     * 读取某一行的变量名
     * @param {*} line 
     * @returns 
     */
    getVarName (line) {
      const matchRe = line.match(variableRegExp)
      if( !matchRe) {
        return ``
      }
      const varName = matchRe[0].trim()
      return varName
    }

    /**
     * 获取当前生成的代码
     * @returns 
     */
    getCodeList () {
      return codeList
    }
    /**
     * 替换指定字符串中的 id 为对应的 key
     */
    replaceIdsWithKeys({str}){
      // 创建一个映射对象，将 id 对应到 key
      const idToKeyMap = {};
  
      dataList.forEach(item => {
        idToKeyMap[`${config.variablePrefix}${item.id}`] = item.key; // 将 id 映射为 key
      });
  
      // 使用正则表达式匹配 id，替换为对应的 key
      const result = str.replace(variableRegExp, (match) => {
        // 查找匹配的 id 并返回对应的 key
        const key = idToKeyMap[match] || match; // 如果没有找到，保留原始字符串
        return key;
      });
  
      return result;
    }
  }
  const codeStrTool = new CodeStrTool()

  /**
   * 对已有的代码进行运行操作
   */
  class CodeRunTool {
    constructor() {
      this.errList = []
      this.delayList = []
    }
    /**
     * 运行代码片段
     * @param {*} code 
     * @returns 
     */
    run(code, ignoreErr = false) {
      const codeRunTool = this
      return new Promise(async (resolve, reject) => {
        try {
          if(!ignoreErr && this.errList.length) {
            return reject(this.getError())
          }
          // 由于 js 只有一个返回值, 所以只取一个
          config.sdk.run([{
            code,
            runType: config.runType,
          }], codeRunTool).then(([res]) => {
            resolve(res)
          }).catch((err) => {
            this.errList.push(err)
            reject(err)
          })
        } catch (err) {
          this.errList.push(err)
          reject(err)
        }
      })
    }

    /**
     * 根据 id 获取对应的函数
     * @param {*} id 
     */
    idToFn(id) {
      return idToFunction[id]
    }
    
    /**
     * 保存即将运行的代码片段
     * @param {*} code 
     * @returns 
     */
    addDelayList(code) {
      this.delayList.push(code)
    }

    /**
     * 运行保存的代码片段
     * @returns 
     */
    async runDelayList(code) {
      const newCode = this.delayList.length ? [
        ...this.delayList,
        code,
      ].join(`\n`) : ``
      const p = new Promise(async (resolve, reject) => {
        if([`createRunerOnce`].includes(config.runType)) {
          codeList = []
          this.delayList = []
          return this.run(newCode).then(resolve).catch(reject)
        }
        this.run(newCode).then( res => {
          this.clearVar(true).catch(err => err).finally(() => {
            resolve(res)
          })
        }).catch( err => {
          this.clearVar(true).catch(err => err).finally(() => {
            reject(err)
          })
        })
      })
      return p
    }

    /**
     * 转换错误信息
     */
    getError() {
      const err = new Error(this.errList[0] || ``)
      err.endLine = codeList.at(-1)
      err.codeStr = codeList.join(`\n`)
      err.formatEndLine = codeStrTool.replaceIdsWithKeys({
        str: err.endLine,
      })
      err.toString = () => {
        return err.message
      }
      return err
    }
    /**
     * 清除变量
     * @returns 
     */
    async clearVar (ignoreErr)  {
      const code = this.getClearVarCode()
      return code ? this.run(code, ignoreErr) : undefined
    }
    /**
     * 获取清除变量的代码
     * @returns 
     */
    getClearVarCode ()  {
      const code = codeList.map(line => {
        const name = codeStrTool.getVarName(line)
        return name ? `delete ${name};` : ``
      }).filter(Boolean).join(`\n`)
      return code || ``
    }
  }
  const codeRunTool = new CodeRunTool()
  return {
    hookDataList2CodeListByYield,
    codeStrTool,
    codeRunTool,
  }
}

module.exports = tool;