const DeepProxy = require(`proxy-deep`)
const util = require(`./util.js`)

function deepTraverseAndReplace(item, opt = {}) {
  opt = util.mergeWithoutUndefined({
    idKey: undefined,
    proxyTag: undefined,
    fnTag: undefined,
    getId: undefined,
  }, opt)
  // 判断是否是对象或数组
  if (typeof item === 'object' && item !== null) {
      // 如果是代理对象并且包含 proxyTag 属性，则直接返回 proxyTag 属性的值
      if (item[opt.proxyTag] !== undefined) {
        return `${opt.proxyTag}${item[opt.idKey]}`
      }

      // 如果是数组，则遍历数组元素
      if (Array.isArray(item)) {
        return item.map(item => deepTraverseAndReplace(item, opt));
      }

      // 如果是对象，则遍历对象的键和值
      const convertedObj = {};
      for (const key in item) {
        if (item.hasOwnProperty(key)) {
          const value = item[key];
          // 递归调用 deepTraverseAndReplace 处理值
          convertedObj[key] = deepTraverseAndReplace(value, opt);
        }
      }
      return convertedObj;
  } else if (typeof item === 'function') {
    if(item[opt.proxyTag] !== undefined) { // 如果是代理函数就添加代理标记
      return `${opt.proxyTag}${item[opt.idKey]}`
    } else { // 如果是普通函数则不进行任何处理
      return item
    }
  } else {
    return item
  }
}

module.exports = (opt = {}) => {
  let startId = 0
  const getId = () => {
    startId = startId + 1
    return String(`_${startId}`)
  }
  opt = util.mergeWithoutUndefined({
    userData: {}, // object
    id: ``, // string
    hook: () => {}, // function
    idKey: `idKey_${util.guid()}`, // 当前id
    parentKey: `parentKey_${util.guid()}`, // 父级id
    proxyTag: `proxyTag_${util.guid()}`, // 有这个标记这说明是代理对象
    fnTag: `fn_${util.guid()}`, // 有这个标记这说明是普通函数
    getId, // id 生成器
  }, opt)
  const getFn = ({ parent, id = getId() } = {}) => {
    const fn = () => { }
    fn[opt.idKey] = id
    fn[opt.parentKey] = parent
    fn[opt.proxyTag] = true
    return {
      fn,
      id,
      parent,
    }
  }
  const { fn, id, parent } = getFn({ id: opt.id })
  const proxy = new DeepProxy(fn, {
    get(target, key, receiver) {
      if ([opt.idKey, opt.proxyTag].includes(key)) {
        return Reflect.get(target, key, receiver);
      } else {
        const data = {
          ...getFn({ parent: target[opt.idKey] }),
          type: `get`,
          key,
        }
        return opt.hook(this, data)
      }
    },
    apply(target, thisArg, args) {
      const data = {
        ...getFn({ parent: target[opt.idKey] }),
        type: `apply`,
        args: deepTraverseAndReplace(args, opt),
        thisArgId: thisArg[opt.idKey],
      }
      return opt.hook(this, data)
    },
    set(target, key, value) {
      const data = {
        ...getFn({ parent: target[opt.idKey] }),
        type: `set`,
        key,
        value: deepTraverseAndReplace(value, opt),
      }
      return opt.hook(this, data)
    },
  }, {
    userData: opt.userData,
  })
  return {
    userData: opt.userData,
    proxy,
    idKey: opt.idKey,
    parentKey: opt.parentKey,
    proxyTag: opt.proxyTag,
  }
}