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

module.exports = {
  TaskQueue,
  sleep,
  guid,
}