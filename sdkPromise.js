const WebSocket = require('websocket').w3cwebsocket;

globalThis.wsLink = `ws://127.0.0.1:20005/rpc`;
globalThis.id = 0;
globalThis.sdkPromise = new Promise(async (resolve, reject) => {
  const sdk = {
    ws: undefined,
    run: undefined,
    runCb: {},
  };
  const ready = await new Promise((resolve, reject) => {
    const ws = new WebSocket(globalThis.wsLink);
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
   * @returns 
   */
  sdk.run = async (params = []) => {
    const id = globalThis.id = (globalThis.id || 0) + 1
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

module.exports = sdkPromise