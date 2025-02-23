/**
 * 判断数据是否为 type, 或返回 type
 * @param {*} data 
 * @param {*} type 
 * @returns 
 */
function isType(data, type = undefined) {
  const dataType = Object.prototype.toString.call(data).match(/\s(.+)]/)[1].toLowerCase()
  return type ? (dataType === type.toLowerCase()) : dataType
}

/**
 * 删除左边空白符
 * @param {*} str 
 * @returns 
 */
function removeLeft(str) {
  const lines = str.split('\n')
  // 获取应该删除的空白符数量
  const minSpaceNum = lines.filter(item => item.trim())
    .map(item => item.match(/(^\s+)?/)[0].length)
    .sort((a, b) => a - b)[0]
  // 删除空白符
  const newStr = lines
    .map(item => item.slice(minSpaceNum))
    .join('\n')
  return newStr
}

/**
 * 合并对象，如果后面对象中的 undefined 值不覆盖前面对象中的值
 * @param  {...any} objects 
 * @returns 
 */
function mergeWithoutUndefined(...objects) {
  return objects.reduce((acc, obj) => {
    Object.keys(obj).forEach((key) => {
      if (obj[key] !== undefined) {
        if (
          typeof acc[key] === 'object' && 
          acc[key] !== null && 
          typeof obj[key] === 'object' && 
          obj[key] !== null &&
          !Array.isArray(acc[key]) && // 排除数组
          !Array.isArray(obj[key])   // 排除数组
        ) {
          // 如果是对象，递归合并
          acc[key] = mergeWithoutUndefined(acc[key], obj[key]);
        } else {
          // 非对象直接赋值
          acc[key] = obj[key];
        }
      }
    });
    return acc;
  }, {});
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

const sleep = (ms = 1e3) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class TaskQueue {
  constructor() {
    this.queue = []; // 存储任务的数组
    this.isRunning = false; // 标记当前是否有任务在运行
  }

  // 添加任务到队列
  addTask(task) {
    this.queue.push(task);
    this.runNext(); // 尝试运行下一个任务
  }

  // 运行下一个任务
  async runNext() {
    if (this.isRunning || this.queue.length === 0) {
      return; // 如果正在运行任务或队列为空，直接返回
    }

    // 设置为正在运行状态
    this.isRunning = true;

    const task = this.queue.shift(); // 从队列中取出下一个任务

    try {
      await task(); // 执行任务
    } catch (error) {
      console.error('Task failed:', error); // 捕获异常并打印错误
    } finally {
      this.isRunning = false; // 运行结束，重置状态
      this.runNext(); // 继续运行下一个任务
    }
  }
  
  awaitEnd() {
    return new Promise((resolve) => {
      let timer
      const fn = () => {
        if (!this.isRunning && this.queue.length === 0) {
          timer && clearInterval(timer);
          resolve();
        }
      }
      fn()
      timer = setInterval(fn, 50);
    });
  }
}

/**
 * 把类似 arr.1 转换为 arr[1]
 * @param {*} str 
 * @returns 
 */
function replaceIdsWithKeys(str) {
  return str.replace(/\.(\d+)/g, '[$1]');
}

module.exports = {
  isType,
  removeLeft,
  mergeWithoutUndefined,
  replaceIdsWithKeys,
  TaskQueue,
  sleep,
  guid,
}