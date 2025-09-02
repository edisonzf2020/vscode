#!/usr/bin/env node

/**
 * 修复Mini VSCode中的混淆导入名称
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🔧 Fixing import names in mini-main.js...');

// 读取文件
const filePath = 'out-build/mini-main.js';
let content = fs.readFileSync(filePath, 'utf8');

// 定义导入映射
const importMappings = {
    // bootstrap-node.js exports
    '$S': 'configurePortable',
    
    // bootstrap-esm.js exports  
    '$V': 'bootstrapESM',
    
    // bootstrap-meta.js exports (already fixed)
    '$O': 'product',
    
    // vs/base/common/jsonc.js exports
    '$gl': 'parse',
    
    // vs/platform/environment/node/userDataPath.js exports
    '$hl': 'getUserDataPath',
    
    // vs/base/node/nls.js exports
    '$ri': 'resolveNLSConfiguration',
    
    // vs/base/node/unc.js exports
    '$bl': 'getUNCHost',
    '$al': 'addUNCHostToAllowlist'
};

// 修复导入语句
console.log('📝 Fixing import statements...');
for (const [oldName, newName] of Object.entries(importMappings)) {
    // 修复导入语句中的名称
    const importRegex = new RegExp(`import\\s*{([^}]*)}\\s*from\\s*'([^']*)'`, 'g');
    content = content.replace(importRegex, (match, imports, modulePath) => {
        const fixedImports = imports.replace(new RegExp(`\\b${oldName.replace('$', '\\$')}\\b`, 'g'), newName);
        return `import { ${fixedImports} } from '${modulePath}'`;
    });
    
    // 修复代码中使用的名称
    const usageRegex = new RegExp(`\\b${oldName.replace('$', '\\$')}\\b`, 'g');
    content = content.replace(usageRegex, newName);
}

// 特殊处理：修复解构导入
content = content.replace(/import\s*{\s*\$bl,\s*\$al\s*}\s*from\s*'\.\/vs\/base\/node\/unc\.js'/, 
                         "import { getUNCHost, addUNCHostToAllowlist } from './vs/base/node/unc.js'");

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Import names fixed successfully!');

// 验证修复结果
console.log('🔍 Checking for remaining $ imports...');
const remainingDollarImports = content.match(/\$[A-Za-z]+/g);
if (remainingDollarImports) {
    console.log('⚠️ Remaining $ imports found:', remainingDollarImports);
} else {
    console.log('✅ No remaining $ imports found!');
}

console.log('🎉 Mini VSCode import fix completed!');
