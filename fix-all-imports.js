#!/usr/bin/env node

/**
 * 修复整个out-build目录中的混淆导入名称
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🔧 Fixing all import names in out-build directory...');

// 定义导入映射 - 基于VSCode的实际导出
const importMappings = {
    // vs/base/common/assert.js
    '$Tc': 'ok',
    '$Uc': 'assertNever',
    '$Vc': 'assert',
    '$Wc': 'softAssert',
    '$Xc': 'assertFn',
    '$Yc': 'checkAdjacentItems',

    // vs/base/common/event.js
    '$ef': 'Emitter',
    '$ff': 'AsyncEmitter',
    '$gf': 'PauseableEmitter',
    '$hf': 'DebounceEmitter',
    '$if': 'MicrotaskEmitter',
    '$jf': 'Event',

    // vs/base/common/performance.js
    '$T': 'mark',

    // bootstrap files
    '$S': 'configurePortable',
    '$V': 'bootstrapESM',
    '$O': 'product',

    // vs/base/common/jsonc.js
    '$gl': 'parse',

    // vs/platform/environment/node/userDataPath.js
    '$hl': 'getUserDataPath',

    // vs/base/node/nls.js
    '$ri': 'resolveNLSConfiguration',

    // vs/base/node/unc.js
    '$bl': 'getUNCHost',
    '$al': 'addUNCHostToAllowlist',

    // vs/base/common/lifecycle.js
    '$Zc': 'Disposable',
    '$ac': 'DisposableStore',
    '$bc': 'toDisposable',
    '$cc': 'dispose',
    '$vd': 'DisposableStore',
    '$td': 'toDisposable',
    '$ud': 'dispose',
    '$wd': 'MutableDisposable',
    '$xd': 'combinedDisposable',

    // 其他常见的混淆名称
    '$kf': 'once',
    '$lf': 'filter',
    '$mf': 'map',
    '$nf': 'forEach',
    '$of': 'buffer',
    '$pf': 'debounce',
    '$qf': 'throttle'
};

function fixFileImports(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // 修复导入语句和使用
        for (const [oldName, newName] of Object.entries(importMappings)) {
            const regex = new RegExp(`\\b${oldName.replace('$', '\\$')}\\b`, 'g');
            if (content.includes(oldName)) {
                content = content.replace(regex, newName);
                modified = true;
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed: ${filePath}`);
        }

        return modified;
    } catch (error) {
        console.warn(`⚠️ Error processing ${filePath}:`, error.message);
        return false;
    }
}

function walkDirectory(dir) {
    const files = fs.readdirSync(dir);
    let totalFixed = 0;

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            totalFixed += walkDirectory(fullPath);
        } else if (file.endsWith('.js')) {
            if (fixFileImports(fullPath)) {
                totalFixed++;
            }
        }
    }

    return totalFixed;
}

// 修复out-build目录
const outBuildDir = 'out-build';
if (fs.existsSync(outBuildDir)) {
    console.log(`📁 Processing directory: ${outBuildDir}`);
    const fixedCount = walkDirectory(outBuildDir);
    console.log(`🎉 Fixed ${fixedCount} files!`);
} else {
    console.error(`❌ Directory ${outBuildDir} not found!`);
}

console.log('✨ Import fix completed!');
