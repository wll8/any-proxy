const DeepProxy = require(`proxy-deep`)
const cb = (_this) => {
  return new Promise(async (res, rej) => {
    // 模拟异步操作
    setTimeout(() => {
      res([..._this.list])
    }, Math.random() * 1000)
  })
}


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
  // 检查是否是数组
  if (Array.isArray(item)) {
    // 如果是数组，递归处理每个元素
    return item.map(element => deepTraverseAndReplace(element, { idKey, proxyTag }));
  } else if (typeof item === 'function' && item[proxyTag] !== undefined) {
    // 如果是函数并具有属性 fn.x，返回 fn.id
    return `${proxyTag}${item[idKey]}`;
  } else {
    // 如果既不是数组也不符合转换规则，直接返回项
    return item;
  }
}

module.exports = (opt = {
  id: undefined, // string
  cb: undefined, // function
  hook: undefined, // function
} = {}) => {
  let startId = 0
  const getId = () => {
    startId = startId + 1
    return String(`_${startId}`)
  }
  const idKey = guid() // 当前id
  const parentKey = guid() // 父级id
  const proxyTag = guid() // 有这个标记这说明是代理对象
  console.log(`idKey`, idKey)
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
  const proxy =  new DeepProxy(fn, {
    get(target, key, receiver) {
      if ([idKey, proxyTag].includes(key)) {
        return Reflect.get(target, key, receiver);
      } else {
        const { fn, id, parent } = getFn({ parent: target[idKey] })
        if ([`then`].includes(key)) { // 取返回值
          const promise = opt.cb(this, { type: `get`, id, parent, key })
          return promise[key].bind(promise)
        } else {
          opt.hook(this, { type: `get`, id, parent, key })
          return this.nest(fn)
        }
      }
    },
    apply(target, thisArg, args) {
      const thisArgId = thisArg[idKey]
      const { fn, id, parent } = getFn({ parent: target[idKey] })
      const xxx = deepTraverseAndReplace(args, { idKey, proxyTag })
      opt.hook(this, { type: `apply`, id, parent, thisArgId, args: xxx })
      return this.nest(fn)
    },
    set(target, key, value) {
      const { fn, id, parent } = getFn({ parent: target[idKey] })
      const xxx = deepTraverseAndReplace(value, { idKey, proxyTag }) 
      opt.hook(this, { type: `set`, id, parent, key, value: xxx})
      return this.nest(fn)
    },
  }, {
    userData: {
      list: [],
    },
  })
  return {
    proxy,
    idKey,
    parentKey,
    proxyTag,
  }
}