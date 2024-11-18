function getPath(id, list) {
  const path = [];
  let currentId = id;

  // 使用一个 Map 来提升查找效率
  const idMap = new Map(list.map(item => [item.id, item]));

  while (currentId) {
    const currentItem = idMap.get(currentId);
    if (!currentItem) break;  // 如果找不到当前 id，则结束循环

    path.unshift(currentItem);  // 将当前 ID 添加到路径
    currentId = currentItem.parent;  // 更新 currentId 为它的父节点
  }

  return path;  // 返回从目标 id 到根的路径
}

function generateCodeFromList(config) {
  const {
    proxyTag,
    list,
    variablePrefix = `v`,
    globalNamespace = ``,
    variableKeyword = `var`,
    lib = [
      `fsys.lnk`,
      `fsys.dlg`,
    ],
  } = config;


  const idToVarName = {};  // 存储 ID 到变量名的映射
  const idToFullPath = {};  // 存储 ID 到路径的映射
  let codeList = [];

  const generateVarName = (id) => `${variablePrefix}${id}`;

  list.forEach(item => {
    const { type, id, parent, key, thisArgId, args, value } = item;
    const typeObj = {
      'get'() {
        const objectVar = parent ? idToVarName[parent] : globalNamespace;
        const varName = generateVarName(id);
        idToVarName[id] = varName;
        const prefix = parent ? `${objectVar}.` : '';
        const fullPath = getPath(id, list).map(item => item.key).join(`.`)
        idToFullPath[id] = fullPath;
        if (lib.includes(idToFullPath[id])) {
          codeList.push(`${variableKeyword} ${varName} = ${idToFullPath[id]};`.trim())
        } else {
          codeList.push(`${variableKeyword} ${varName} = ${prefix}${key};`.trim())
        }
      },
      'apply'() {
        const funcVar = idToVarName[parent];
        const thisArg = thisArgId ? idToVarName[thisArgId] : 'null';
        const evalArgs = args.map(arg => {
          if (typeof (arg) === `function` && arg.startsWith(proxyTag)) {
            return idToVarName[arg.replace(proxyTag, '')]
          } else {
            return JSON.stringify(arg);
          }
        }).join(', ');
        const returnVar = generateVarName(id);
        idToVarName[id] = returnVar;
        codeList.push([
          `${variableKeyword} ${returnVar}_ALL = {call(${funcVar}, ${thisArg}, ${evalArgs || null})};`.trim(),
          `${variableKeyword} ${returnVar} = ${returnVar}_ALL[2]`.trim(),
        ].join(`\n`))
      },
      'set'() {
        const objVar = idToVarName[parent];
        const valueArgs = value.startsWith(proxyTag) ? idToVarName[value.replace(proxyTag, '')] : JSON.stringify(value);
        codeList.push(`${objVar}.${key} = ${valueArgs};`)
      },
    }
    typeObj[type] && typeObj[type]()
  });

  return codeList
}



module.exports = generateCodeFromList;