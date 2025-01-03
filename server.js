const { Worker } = require("worker_threads");
const WebSocketServer = require('rpc-websockets').Server
const server = new WebSocketServer({
  port: 30005,
  host: '0.0.0.0'
})

const seprateThread = new Worker(`./seprateThread2.js`);
seprateThread.on(`message`, (data) => {
  server.emit(`codeMsg`, data)
  console.log(`datadata`, data)
});

server.event(`codeMsg`)
server.register('run', (codeInfo) => {
  seprateThread.postMessage(codeInfo);
  return {
    id: codeInfo.id,
    data: {
      type: `sendOk`,
    }
  }
})
