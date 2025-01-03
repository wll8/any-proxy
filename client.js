require(`util`).inspect.defaultOptions.depth = 4 // console.log 展开对象
const util = require('./util.js')
const WebSocket = require('rpc-websockets').Client
const ws = new WebSocket('ws://127.0.0.1:30005')
const mitt = require('mitt')
const emitter = mitt()

const sendRun = (opt) => {
  opt = util.mergeWithoutUndefined({
    id: ``,
    code: ``,
    args: [],
    sendOk: (...args) => console.log(`sendOk`, args),
    sendErr: (...args) => console.log(`sendErr`, args),
    runOk: (...args) => console.log(`runOk`, args),
    runErr: (...args) => console.log(`runErr`, args),
    cbArg: (...args) => console.log(`cbArg`, args),
  }, opt)
  ws.call('run', {
    id: opt.id,
    code: util.removeLeft(opt.code),
    args: opt.args,
  }).then((codeInfo) => {
    opt.sendOk(codeInfo)
    emitter.on(opt.id, (idInfo) => {
      if(idInfo.data.type === `runErr`) {
        opt.runErr(idInfo)
        emitter.off(opt.id)
      } else if(idInfo.data.type === `runOk`) {
        opt.runOk(idInfo)
        emitter.off(opt.id)
      } else if(idInfo.data.type === `cbArg`) {
        opt.cbArg(idInfo)
      }
    })
  }).catch(err => {
    opt.sendErr(err)
  })
}

ws.on('open', function() {
  ws.subscribe(`codeMsg`)
  ws.on(`codeMsg`, (idInfo) => {
    emitter.emit(idInfo.id, idInfo)
  })
  const fnId = `fn_1`
  const id = util.guid()
  sendRun({
    id,
    code: `
      v_1 = Array;
      v_2 = v_1.from;
      v_3 = v_2.apply(v_1, [[1,2,3,4]]);
      v_4 = v_3.findIndex;
      v_5 = v_4.apply(v_3, [(...args) => {
        let done = false;
        let data = undefined;
        ${fnId} = {
          args,
          size: args.length,
          done(res) {
            done = true;
            data = res;
          }
        };
        parentPort.postMessage({
          id: "${id}",
          data: {
            type: "cbArg",
            res: ["${fnId}"]
          },
        });
        deasync.loopWhile(() => !done);
        delete ${fnId}
        return data;
      }]);
      return v_5;
    `,
    args: [1, 2, 3],
    cbArg: (idInfo) => {
      const id = util.guid()
      sendRun({
        id,
        code: `
          return fn_1.args
        `,
        runOk(idInfo){
          const [[item, index]] = idInfo.data.res
          console.log(`runOk`, idInfo)
          const id = util.guid()
          const res = item === 2
          sendRun({
            id,
            code: `
              return fn_1.done(${res})
            `,
          })
        },
      })
      console.log(`cbArg`, idInfo.data.res)
    },
  })
})