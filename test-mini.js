// 简单测试Mini VSCode是否能启动
console.log('🚀 Testing Mini VSCode startup...');

// 设置Mini模式环境变量
process.env['MINI_VSCODE'] = 'true';
process.env['VSCODE_DEV'] = 'true';

console.log('📋 Environment variables set:');
console.log('  MINI_VSCODE:', process.env['MINI_VSCODE']);
console.log('  VSCODE_DEV:', process.env['VSCODE_DEV']);

// 尝试导入并运行原始的main.js
console.log('🔧 Importing main.js...');

try {
    await import('./out-build/main.js');
    console.log('✅ Main.js imported successfully!');
} catch (error) {
    console.error('❌ Error importing main.js:', error);
}
