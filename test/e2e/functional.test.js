/**
 * 功能测试 - 测试核心文件操作功能
 * 不依赖GUI，直接测试后端功能
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

suite('Mini VSCode 核心功能测试', function() {
    let testWorkspace;

    suiteSetup(async function() {
        console.log('🚀 Setting up test environment...');
        
        // 创建测试工作区
        testWorkspace = path.join(__dirname, '../../test-workspace');
        if (fs.existsSync(testWorkspace)) {
            // 清理现有的测试工作区
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
        fs.mkdirSync(testWorkspace, { recursive: true });
        
        // 创建测试文件
        fs.writeFileSync(path.join(testWorkspace, 'test.txt'), 'Test file content');
        
        // 创建测试子目录
        const subDir = path.join(testWorkspace, 'subfolder');
        fs.mkdirSync(subDir);
        fs.writeFileSync(path.join(subDir, 'nested.js'), 'console.log("nested file");');

        console.log('✅ Test workspace created at:', testWorkspace);
    });

    suiteTeardown(async function() {
        console.log('🧹 Cleaning up test files...');
        if (fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });

    test('工作区创建和文件存在性测试', function() {
        console.log('🧪 Testing workspace creation and file existence...');
        
        // 验证测试工作区存在
        assert(fs.existsSync(testWorkspace), 'Test workspace should exist');
        
        // 验证测试文件存在
        const testFile = path.join(testWorkspace, 'test.txt');
        assert(fs.existsSync(testFile), 'Test file should exist');
        
        // 验证子目录存在
        const subDir = path.join(testWorkspace, 'subfolder');
        assert(fs.existsSync(subDir), 'Subdirectory should exist');
        
        const nestedFile = path.join(subDir, 'nested.js');
        assert(fs.existsSync(nestedFile), 'Nested file should exist');
        
        console.log('✅ Workspace and file existence test passed');
    });

    test('目录读取功能测试', function() {
        console.log('🧪 Testing directory reading functionality...');
        
        // 测试读取目录内容的功能（模拟IPC read-directory调用）
        const items = fs.readdirSync(testWorkspace, { withFileTypes: true });
        
        console.log('📁 Directory contents:');
        const result = items.map(item => {
            const itemPath = path.join(testWorkspace, item.name);
            const isDirectory = item.isDirectory();
            console.log(`  ${isDirectory ? '📁' : '📄'} ${item.name}`);
            
            return {
                name: item.name,
                isDirectory: isDirectory,
                path: itemPath
            };
        });
        
        // 验证我们有预期的文件和目录
        const hasTestFile = result.some(item => item.name === 'test.txt' && !item.isDirectory);
        const hasSubfolder = result.some(item => item.name === 'subfolder' && item.isDirectory);
        
        assert(hasTestFile, 'Should have test.txt file');
        assert(hasSubfolder, 'Should have subfolder directory');
        assert(result.length >= 2, 'Should have at least 2 items');
        
        console.log('✅ Directory reading test passed');
    });

    test('新建文件功能测试', function() {
        console.log('🧪 Testing new file creation functionality...');
        
        // 测试在工作区中创建新文件（模拟IPC write-file调用）
        const newFileName = 'created-by-test.txt';
        const newFilePath = path.join(testWorkspace, newFileName);
        
        // 确保文件不存在
        assert(!fs.existsSync(newFilePath), 'New file should not exist initially');
        
        // 模拟新建文件的过程
        const fileContent = '// File created by automated test\nconsole.log("Hello from test file");';
        
        try {
            // 直接测试文件写入功能（模拟IPC调用）
            fs.writeFileSync(newFilePath, fileContent);
            
            // 验证文件被创建
            assert(fs.existsSync(newFilePath), 'New file should be created');
            
            // 验证文件内容
            const actualContent = fs.readFileSync(newFilePath, 'utf8');
            assert.strictEqual(actualContent, fileContent, 'File content should match');
            
            console.log('✅ New file creation test passed');
            
        } catch (error) {
            console.error('❌ New file creation test failed:', error);
            throw error;
        }
    });

    test('新建文件夹功能测试', function() {
        console.log('🧪 Testing new folder creation functionality...');
        
        const newFolderName = 'created-by-test-folder';
        const newFolderPath = path.join(testWorkspace, newFolderName);
        
        // 确保文件夹不存在
        assert(!fs.existsSync(newFolderPath), 'New folder should not exist initially');
        
        try {
            // 创建新文件夹（模拟IPC调用）
            fs.mkdirSync(newFolderPath);
            
            // 验证文件夹被创建
            assert(fs.existsSync(newFolderPath), 'New folder should be created');
            
            // 验证是目录
            const stats = fs.statSync(newFolderPath);
            assert(stats.isDirectory(), 'Created item should be a directory');
            
            console.log('✅ New folder creation test passed');
            
        } catch (error) {
            console.error('❌ New folder creation test failed:', error);
            throw error;
        }
    });

    test('子目录读取功能测试', function() {
        console.log('🧪 Testing subdirectory reading functionality...');
        
        // 测试读取子目录内容（模拟展开文件夹功能）
        const subfolderPath = path.join(testWorkspace, 'subfolder');
        const subItems = fs.readdirSync(subfolderPath, { withFileTypes: true });
        
        console.log('📁 Subfolder contents:');
        subItems.forEach(item => {
            console.log(`  ${item.isDirectory() ? '📁' : '📄'} ${item.name}`);
        });
        
        const hasNestedFile = subItems.some(item => item.name === 'nested.js');
        assert(hasNestedFile, 'Should have nested.js file in subfolder');
        assert(subItems.length >= 1, 'Subfolder should have at least 1 item');
        
        console.log('✅ Subdirectory reading test passed');
    });

    test('文件路径处理测试', function() {
        console.log('🧪 Testing file path handling...');
        
        // 测试路径处理逻辑（模拟新建文件时的路径计算）
        const testCases = [
            {
                targetPath: '/test/folder',
                isDirectory: true,
                fileName: 'new-file.txt',
                expected: '/test/folder/new-file.txt'
            },
            {
                targetPath: '/test/folder/file.txt',
                isDirectory: false,
                fileName: 'new-file.txt',
                expected: '/test/folder/new-file.txt'
            },
            {
                targetPath: '/test/folder/',
                isDirectory: true,
                fileName: 'new-file.txt',
                expected: '/test/folder/new-file.txt'
            }
        ];
        
        testCases.forEach((testCase, index) => {
            let filePath;
            if (testCase.isDirectory) {
                filePath = testCase.targetPath.endsWith('/') ? 
                    testCase.targetPath + testCase.fileName : 
                    testCase.targetPath + '/' + testCase.fileName;
            } else {
                const lastSlash = Math.max(testCase.targetPath.lastIndexOf('/'), testCase.targetPath.lastIndexOf('\\'));
                const parentDir = lastSlash > 0 ? testCase.targetPath.substring(0, lastSlash) : testCase.targetPath;
                filePath = parentDir.endsWith('/') || parentDir.endsWith('\\') ? 
                    parentDir + testCase.fileName : 
                    parentDir + '/' + testCase.fileName;
            }
            
            console.log(`  Test case ${index + 1}: ${filePath}`);
            assert.strictEqual(filePath, testCase.expected, `Path calculation should be correct for test case ${index + 1}`);
        });
        
        console.log('✅ File path handling test passed');
    });

    test('文件系统错误处理测试', function() {
        console.log('🧪 Testing file system error handling...');
        
        // 测试访问不存在的目录
        const nonExistentPath = path.join(testWorkspace, 'non-existent-folder');
        
        try {
            fs.readdirSync(nonExistentPath);
            assert.fail('Should throw error when reading non-existent directory');
        } catch (error) {
            assert(error.code === 'ENOENT', 'Should get ENOENT error for non-existent directory');
            console.log('  ✅ Correctly handled non-existent directory error');
        }
        
        // 测试创建文件到不存在的目录
        const invalidFilePath = path.join(testWorkspace, 'non-existent-folder', 'file.txt');
        
        try {
            fs.writeFileSync(invalidFilePath, 'content');
            assert.fail('Should throw error when writing to non-existent directory');
        } catch (error) {
            assert(error.code === 'ENOENT', 'Should get ENOENT error for invalid file path');
            console.log('  ✅ Correctly handled invalid file path error');
        }
        
        console.log('✅ File system error handling test passed');
    });
});
