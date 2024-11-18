function generateCodeFromList(listObj) {
  const {
    proxyTag,
    list,
    variablePrefix = ``,
    globalNamespace = ``,
    variableKeyword = `const`,
  } = listObj;
  const idToVarName = {};  // 存储 ID 到变量名的映射
  let code = '';

  const generateVarName = (id) => `${variablePrefix}${id}`;

  list.forEach(item => {
    const { type, id, parent, key, thisArgId, args, value } = item;

    switch (type) {
      case 'get':
        const objectVar = parent ? idToVarName[parent] : globalNamespace;
        const varName = generateVarName(id);
        idToVarName[id] = varName;
        const prefix = parent ? `${objectVar}.` : '';
        code += `${variableKeyword} ${varName} = ${prefix}${key};\n`;
        break;

      case 'apply':
        const funcVar = idToVarName[parent];
        const thisArg = thisArgId ? idToVarName[thisArgId] : 'undefined';
        const evalArgs = args.map(arg => {
          return arg.startsWith(proxyTag) ? idToVarName[arg.replace(proxyTag, '')] : JSON.stringify(arg);
        }).join(', ');
        const returnVar = generateVarName(id);
        idToVarName[id] = returnVar;
        code += `${variableKeyword} ${returnVar} = call(${funcVar}, ${thisArg}, ${evalArgs});\n`;
        break;

      case 'set':
        const objVar = idToVarName[parent];
        code += `${objVar}.${key} = ${JSON.stringify(value)};\n`;
        break;

      default:
        break;
    }
  });

  return code;
}

module.exports = generateCodeFromList;