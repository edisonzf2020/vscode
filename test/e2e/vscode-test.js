/**
 * VSCode Test Electron - 真正的端到端测试
 * 使用 @vscode/test-electron 进行测试
 */

const { runTests } = require('@vscode/test-electron');
const path = require('path');

async function main() {
    try {
        console.log('🚀 Starting VSCode Test Electron...');
        
        // 测试配置
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/index.js');
        
        console.log('📁 Extension path:', extensionDevelopmentPath);
        console.log('🧪 Test suite path:', extensionTestsPath);
        
        // 运行测试
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                '--disable-extensions',
                '--disable-workspace-trust'
            ]
        });
        
        console.log('✅ All tests passed!');
    } catch (err) {
        console.error('❌ Failed to run tests:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
