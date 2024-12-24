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
  config = Object.assign({
    proxyTag: ``,
    variablePrefix: `v`,
    globalNamespace: ``,
    variableKeyword: ``,
    lib: [],
    sdk: undefined,
  }, config)

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
  const dataList = [];
  /**
   * 保存生成的代码
   */
  const codeList = [];

  /**
   * 将 dataListItem 转换为代码片段
   * @param {*} item 
   * @returns 
   */
  function* hookDataList2CodeListByYield(item) {
    dataList.push(item)
    const generateVarName = (id) => `${config.variablePrefix}${id}`;
    const { type, id, parent, key, thisArgId, args, value } = item;
    const typeObj = {
      'get'() {
        const objVar = parent ? idToVarName[parent] : config.globalNamespace;
        const varName = generateVarName(id);
        idToVarName[id] = varName;
        const prefix = parent ? `${objVar}.` : '';
        const fullPath = getPath(id, dataList).map(item => item.key).join(`.`)
        idToFullPath[id] = fullPath;
        if (config.lib.includes(idToFullPath[id])) {
          codeList.push(`${config.variableKeyword} ${varName} = ${idToFullPath[id]};`.trim())
        } else {
          codeList.push(`${config.variableKeyword} ${varName} = ${prefix}${key};`.trim())
        }
      },
      'apply'() {
        const funcVar = idToVarName[parent];
        const thisArg = thisArgId ? idToVarName[thisArgId] : 'null';
        // 递归转换代理标记为变量名
        function replaceProxyTag(args) {
          const list = args.map(item => {
            const re = new RegExp(`"${config.proxyTag}(_[0-9]+)"`, `gm`)
            item = typeof(item) === `undefined` ? null : item
            return JSON.stringify(item).replace(re, `${config.variablePrefix}$1`)
          })
          return list.join(`, `)
        }
        
        
        const evalArgs = replaceProxyTag(args);
        const returnVar = generateVarName(id);
        idToVarName[id] = returnVar;
        codeList.push([
          `${config.variableKeyword} ${returnVar} = ${funcVar}.apply(${thisArg}, [${evalArgs}])`.trim(),
        ].join(`\n`))
      },
      'set'() {
        const objVar = parent ? idToVarName[parent] : config.globalNamespace;
        const setKey = objVar ? `${objVar}.${key}` : key;
        const valueArgs = String(value).startsWith(config.proxyTag) ? idToVarName[value.replace(config.proxyTag, '')] : JSON.stringify(value);
        codeList.push(`${setKey} = ${valueArgs};`)
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
      const snedLine = parentVarName === varName ? `return ${varName}` : `return ${parentVarName}`
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
      return new Promise(async (resolve, reject) => {
        try {
          if(!ignoreErr && this.errList.length) {
            return reject(this.getError())
          }
          // 由于 js 只有一个返回值, 所以只取一个
          config.sdk.run(code).then(([res]) => {
            resolve(res)
          }).catch(err => {
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