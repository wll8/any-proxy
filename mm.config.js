const { Worker } = require("worker_threads");
const WebSocketServer = require('rpc-websockets').Server
const server = new WebSocketServer({
  port: 30005,
  host: '0.0.0.0'
})
const seprateThread = new Worker(`./seprateThread.js`);
seprateThread.on(`message`, (data) => {
  server.emit(`codeMsg`, data)
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

const cli = process.argv.map(item => `"${item}"`).join(` `)
console.log(cli)

/**
 * @see: https://www.hongqiye.com/doc/mockm/config/option.html
 * @type {import('mockm/@types/config').Config}
 */
module.exports = mockmUtil => {
  return {
    port: 20005,
    testPort: 20006,
    replayPort: 20007,
  }
}
