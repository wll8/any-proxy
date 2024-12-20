const toAardio = require(`./to.aardio.js`)
const toJs = require(`./to.js.js`)

const transform = async (opt = {}) => {
  opt = Object.assign({
    to: ``, // js, aardio
    proxyTag: ``, // string
    list: [], // 数据列表
    variablePrefix: `v`,
    variableKeyword: ``,
  }, opt)
  if ([`js`].includes(opt.to)) {
    const sdk = await require(`./sdkPromise.js`)
    let obj = {}
    obj = {
      /**
       * 运行代码片段
       * @param {*} code 
       * @returns 
       */
      run: async (code = ``) => {
        return new Promise(async (resolve, reject) => {
          try {
            // 由于 js 只有一个返回值, 所以只取一个
            sdk.run(code).then(([res]) => {
              resolve(res)
            }).catch(err => {
              reject(err)
            })
          } catch (err) {
            reject(err)
          }
        })
      },
      /**
       * 获取某一行的返回值
       * @param {*} args 
       * @returns 
       */
      awaitCb: (args) => {
        const [_this, data] = args
        const line = _this.info.endLine
        const varName = obj.getVarName(line)
        const parentVarName = `${opt.variablePrefix}${data.parent}`
        const snedLine = parentVarName === varName ? `return ${varName}` : `return ${parentVarName}`
        return snedLine
      },
      /**
       * 读取变量名
       * @param {*} line 
       * @returns 
       */
      getVarName: (line) => {
        const re = obj.getVariableRegExp()
        const matchRe = line.match(re)
        if( !matchRe) {
          return ``
        }
        const varName = matchRe[0].trim()
        return varName
      },
      /**
       * 转换并获取代码
       * @returns 
       */
      getCode: () => {
        return toJs({
          ...opt,
          proxyTag: opt.proxyTag,
          list: opt.list,
        })
      },
      /**
       * 清除变量
       * @returns 
       */
      clearVar: async () => {
        const list = await obj.getCode()
        const code = list.map(line => {
          const name = obj.getVarName(line)
          return name ? `delete ${name};` : ``
        }).filter(Boolean).join(`\n`)
        return code ? obj.run(code) : undefined
      },
      /**
       * 转换错误信息
       */
      getError: (arg) => {
        const { errList, info } = arg
        const err = new Error(errList[0] || ``)
        err.endLine = info.endLine
        err.codeStr = info.codeList.join(`\n`)
        err.formatEndLine = obj.replaceIdsWithKeys({
          list: info.dataList,
          str: info.endLine,
        })
        return err
      },
      /**
       * 替换指定字符串中的 id 为对应的 key
       */
      replaceIdsWithKeys({list, str}){
        // 创建一个映射对象，将 id 对应到 key
        const idToKeyMap = {};
    
        list.forEach(item => {
          idToKeyMap[`${opt.variablePrefix}${item.id}`] = item.key; // 将 id 映射为 key
        });
    
        // 使用正则表达式匹配 id，替换为对应的 key
        const regex = obj.getVariableRegExp()
    
        const result = str.replace(regex, (match) => {
          // 查找匹配的 id 并返回对应的 key
          const key = idToKeyMap[match] || match; // 如果没有找到，保留原始字符串
          return key;
        });
    
        return result;
      },
      getVariableRegExp() {
        const regex = new RegExp(`${opt.variablePrefix}_[0-9]+`, `gm`); // 匹配以 _ 开头后跟数字的字符串
        return regex
      }
    }
    return obj
  } else if ([`aardio`].includes(opt.to)) {
    return {
      run: async (code = ``) => {
        return new Promise(async (resolve, reject) => {
          setTimeout(() => {
            try {
              resolve(code)
            } catch (err) {
              reject(err)
            }
          }, Math.random() * 0)
        })
      },
      awaitCb: (endLine) => {
        const re = new RegExp(`^(.+?)\\=`)
        const varName = endLine.match(re)[1].trim()
        const snedLine = `// send ${varName}`
        return snedLine
      },
      code: () => {
        return toAardio({
          ...opt,
          proxyTag: opt.proxyTag,
          list: opt.list,
        })
      },
    }
  }
}

module.exports = transform
