const DeepProxy = require(`proxy-deep`)

/**
 * 生成 guid
 * @param {string} format 格式
 */
function guid(format = 'gxxxxxxxx_xxxx_xxxx_xxxx_xxxxxxxxxxxx') {
  return format.replace(/[x]/g, function (c) {
    // eslint-disable-next-line
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function deepTraverseAndReplace(item, { idKey, proxyTag } = {}) {
  // 判断是否是对象或数组
  if (typeof item === 'object' && item !== null) {
      // 如果是代理对象并且包含 proxyTag 属性，则直接返回 proxyTag 属性的值
      if (item[proxyTag] !== undefined) {
        return `${proxyTag}${item[idKey]}`
      }

      // 如果是数组，则遍历数组元素
      if (Array.isArray(item)) {
        return item.map(item => deepTraverseAndReplace(item, { idKey, proxyTag }));
      }

      // 如果是对象，则遍历对象的键和值
      const convertedObj = {};
      for (const key in item) {
        if (item.hasOwnProperty(key)) {
          const value = item[key];
          // 递归调用 deepTraverseAndReplace 处理值
          convertedObj[key] = deepTraverseAndReplace(value, { idKey, proxyTag });
        }
      }
      return convertedObj;
  } else if (typeof item === 'function' && item[proxyTag] !== undefined) {
    return `${proxyTag}${item[idKey]}`
  } else {
    return item
  }
}

module.exports = (opt = {}) => {
  opt = Object.assign({
    userData: {}, // object
    id: ``, // string
    hook: () => {}, // function
  }, opt)
  let startId = 0
  const getId = () => {
    startId = startId + 1
    return String(`_${startId}`)
  }
  const idKey = `idKey_${guid()}` // 当前id
  const parentKey = `parentKey_${guid()}` // 父级id
  const proxyTag = `proxyTag_${guid()}` // 有这个标记这说明是代理对象
  const getFn = ({ parent, id = getId() } = {}) => {
    const fn = () => { }
    fn[idKey] = id
    fn[parentKey] = parent
    fn[proxyTag] = true
    return {
      fn,
      id,
      parent,
    }
  }
  const { fn, id, parent } = getFn({ id: opt.id })
  const proxy = new DeepProxy(fn, {
    get(target, key, receiver) {
      if ([idKey, proxyTag].includes(key)) {
        return Reflect.get(target, key, receiver);
      } else {
        const data = {
          ...getFn({ parent: target[idKey] }),
          type: `get`,
          key,
        }
        return opt.hook(this, data)
      }
    },
    apply(target, thisArg, args) {
      const data = {
        ...getFn({ parent: target[idKey] }),
        type: `apply`,
        args: deepTraverseAndReplace(args, { idKey, proxyTag }),
        thisArgId: thisArg[idKey],
      }
      return opt.hook(this, data)
    },
    set(target, key, value) {
      const data = {
        ...getFn({ parent: target[idKey] }),
        type: `set`,
        key,
        value: deepTraverseAndReplace(value, { idKey, proxyTag }),
      }
      return opt.hook(this, data)
    },
  }, {
    userData: opt.userData,
  })
  return {
    userData: opt.userData,
    proxy,
    idKey,
    parentKey,
    proxyTag,
  }
}