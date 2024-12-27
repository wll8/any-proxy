const WebSocket = require('websocket').w3cwebsocket;

const wsLink = `ws://127.0.0.1:20005/rpc`;

globalThis.sdkPromise = new Promise(async (resolve, reject) => {
  const sdk = {
    ws: undefined,
    run: undefined,
    runCb: {},
  };
  const ready = await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsLink);
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
          const [err, ...res] = data.result;
          err ? errCb(err) : resCb(res);
          delete pFn;
        }
      }
    };
    ws.onerror = reject;
  }).catch((err) => reject(err));
  const { ws } = ready;
  sdk.ws = ws;
  sdk.run = async (params) => {
    const id = globalThis.id = (globalThis.id || 0) + 1
    const data = {
      jsonrpc: `2.0`,
      method: `run`,
      params: typeof (params) === `string` ? [params] : params,
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