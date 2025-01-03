const WebSocket = require('websocket').w3cwebsocket;

function getSdk(key = `rpc`) {
  globalThis[key] = globalThis[key] || {}
  const rpc = globalThis[key]
  rpc.wsLink = `ws://127.0.0.1:20005/rpc`;
  rpc.id = 0;
  rpc.sdkPromise = rpc.sdkPromise || new Promise(async (resolve, reject) => {
    const sdk = {
      ws: undefined,
      run: undefined,
      runCb: {},
    };
    const ready = await new Promise((resolve, reject) => {
      const ws = new WebSocket(rpc.wsLink);
      ws.onopen = (evt) => {
        resolve({ ws });
      };
      ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data || `{}`);
        if (!data.id) {
          // 例如整个 rpc 服务报错时没有 id
          Object.values(sdk.runCb).forEach(([resCb, errCb]) => {
            errCb(data.error);
          });
        } else {
          const pFn = sdk.runCb[data.id]; // promise 的回调函数
          if (pFn) {
            const [resCb, errCb] = pFn;
            const [resObj] = data.result;
            resObj.err ? errCb(resObj.err) : resCb(resObj.res);
            delete pFn;
          }
        }
      };
      ws.onerror = reject;
    }).catch((err) => reject(err));
    const { ws } = ready;
    sdk.ws = ws;
    /**
     * 调用远程 run 方法, params 仅支持数组
     * @param {*} params 
     * @param {*} ctx 上下文信息
     * @returns 
     */
    sdk.run = async (params = [], ctx) => {
      const id = rpc.id = (rpc.id || 0) + 1
      const data = {
        jsonrpc: `2.0`,
        method: `run`,
        params,
        id,
      };
      return new Promise((resolve, reject) => {
        sdk.runCb[id] = [resolve, reject];
        ws.send(JSON.stringify(data));
      });
    };
    resolve(sdk);
  });
  return rpc.sdkPromise
}
module.exports = {
  getSdk,
}