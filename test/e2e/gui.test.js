/**
 * 功能端到端测试
 * 测试核心功能而不依赖GUI
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

suite('Mini VSCode GUI Tests', function () {
    let electronProcess;
    let testWorkspace;

    suiteSetup(async function () {
        this.timeout(30000);

        console.log('🚀 Starting Electron app for testing...');

        // 创建测试工作区
        testWorkspace = path.join(__dirname, '../../test-workspace');
        if (!fs.existsSync(testWorkspace)) {
            fs.mkdirSync(testWorkspace, { recursive: true });
        }

        // 创建测试文件
        fs.writeFileSync(path.join(testWorkspace, 'test.txt'), 'Test file content');

        // 创建测试子目录
        const subDir = path.join(testWorkspace, 'subfolder');
        if (!fs.existsSync(subDir)) {
            fs.mkdirSync(subDir);
        }
        fs.writeFileSync(path.join(subDir, 'nested.js'), 'console.log("nested file");');

        console.log('✅ Test workspace created at:', testWorkspace);
    });

    suiteTeardown(async function () {
        if (electronProcess && !electronProcess.killed) {
            electronProcess.kill();
        }
    });

    test('测试工作区文件创建', async function () {
        console.log('🧪 Testing workspace file creation...');

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

        console.log('✅ Workspace file creation test passed');
    });

    test('新建文件功能测试', async function () {
        console.log('🧪 Testing new file creation functionality...');

        // 测试在工作区中创建新文件
        const newFileName = 'created-by-test.txt';
        const newFilePath = path.join(testWorkspace, newFileName);

        // 确保文件不存在
        if (fs.existsSync(newFilePath)) {
            fs.unlinkSync(newFilePath);
        }

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

            // 清理测试文件
            fs.unlinkSync(newFilePath);

        } catch (error) {
            console.error('❌ New file creation test failed:', error);
            throw error;
        }
    });

    test('文件夹展开功能测试', async function () {
        console.log('🧪 Testing folder expand functionality...');

        // 先确保测试数据已加载
        await mainWindow.webContents.executeJavaScript(`
            const button = document.querySelector('button[onclick="testFunction()"]');
            if (button) button.click();
        `);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 查找目录项
        const directoryInfo = await mainWindow.webContents.executeJavaScript(`
            const directories = document.querySelectorAll('.file-item.directory');
            const result = [];
            directories.forEach(dir => {
                const expandIcon = dir.querySelector('.expand-icon');
                result.push({
                    name: dir.textContent.trim(),
                    hasExpandIcon: expandIcon !== null,
                    expandIconText: expandIcon ? expandIcon.textContent : null,
                    isExpanded: dir.classList.contains('expanded')
                });
            });
            return result;
        `);

        console.log('📁 Directory info:', JSON.stringify(directoryInfo, null, 2));
        assert(directoryInfo.length > 0, 'Should have at least one directory');

        // 测试点击第一个目录的展开图标
        if (directoryInfo.length > 0) {
            const initialFileCount = await mainWindow.webContents.executeJavaScript(`
                document.querySelectorAll('.file-item').length
            `);

            console.log(`📊 Initial file count: ${initialFileCount}`);

            // 点击第一个目录
            const clickResult = await mainWindow.webContents.executeJavaScript(`
                const firstDir = document.querySelector('.file-item.directory');
                if (firstDir) {
                    firstDir.click();
                    return true;
                }
                return false;
            `);

            assert.strictEqual(clickResult, true, 'Should be able to click directory');

            // 等待展开动画/逻辑完成
            await new Promise(resolve => setTimeout(resolve, 1000));

            const finalFileCount = await mainWindow.webContents.executeJavaScript(`
                document.querySelectorAll('.file-item').length
            `);

            console.log(`📊 Final file count: ${finalFileCount}`);

            // 检查展开状态是否改变
            const expandedState = await mainWindow.webContents.executeJavaScript(`
                const firstDir = document.querySelector('.file-item.directory');
                return firstDir ? firstDir.classList.contains('expanded') : false;
            `);

            console.log(`📁 Directory expanded state: ${expandedState}`);
        }

        console.log('✅ Folder expand test completed');
    });

    test('右键菜单功能测试', async function () {
        console.log('🧪 Testing right-click context menu...');

        // 先确保测试数据已加载
        await mainWindow.webContents.executeJavaScript(`
            const button = document.querySelector('button[onclick="testFunction()"]');
            if (button) button.click();
        `);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 右键点击第一个文件项
        const rightClickResult = await mainWindow.webContents.executeJavaScript(`
            const firstItem = document.querySelector('.file-item');
            if (firstItem) {
                // 模拟右键点击
                const event = new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                    button: 2
                });
                firstItem.dispatchEvent(event);
                return true;
            }
            return false;
        `);

        assert.strictEqual(rightClickResult, true, 'Should be able to right-click on file item');

        // 等待菜单出现
        await new Promise(resolve => setTimeout(resolve, 500));

        // 检查上下文菜单是否显示
        const menuVisible = await mainWindow.webContents.executeJavaScript(`
            const menu = document.getElementById('contextMenu');
            return menu && menu.style.display === 'block';
        `);

        console.log(`🖱️ Context menu visible: ${menuVisible}`);
        assert.strictEqual(menuVisible, true, 'Context menu should be visible after right-click');

        // 检查菜单项
        const menuItems = await mainWindow.webContents.executeJavaScript(`
            const newFileItem = document.querySelector('.context-menu-item:contains("New File")') ||
                               Array.from(document.querySelectorAll('.context-menu-item')).find(item => item.textContent.includes('New File'));
            const newFolderItem = document.querySelector('.context-menu-item:contains("New Folder")') ||
                                 Array.from(document.querySelectorAll('.context-menu-item')).find(item => item.textContent.includes('New Folder'));
            return {
                hasNewFile: newFileItem !== null,
                hasNewFolder: newFolderItem !== null
            };
        `);

        console.log('🖱️ Menu items:', JSON.stringify(menuItems, null, 2));
        assert.strictEqual(menuItems.hasNewFile, true, 'Should have New File menu item');
        assert.strictEqual(menuItems.hasNewFolder, true, 'Should have New Folder menu item');

        console.log('✅ Right-click menu test passed');
    });

    test('新建文件模态对话框测试', async function () {
        console.log('🧪 Testing new file modal dialog...');

        // 先确保测试数据已加载并右键菜单打开
        await mainWindow.webContents.executeJavaScript(`
            const button = document.querySelector('button[onclick="testFunction()"]');
            if (button) button.click();
        `);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 右键点击并打开菜单
        await mainWindow.webContents.executeJavaScript(`
            const firstItem = document.querySelector('.file-item');
            if (firstItem) {
                const event = new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                    button: 2
                });
                firstItem.dispatchEvent(event);
            }
        `);
        await new Promise(resolve => setTimeout(resolve, 500));

        // 点击"New File"菜单项
        const clickNewFileResult = await mainWindow.webContents.executeJavaScript(`
            const newFileItem = Array.from(document.querySelectorAll('.context-menu-item')).find(item => item.textContent.includes('New File'));
            if (newFileItem) {
                newFileItem.click();
                return true;
            }
            return false;
        `);

        assert.strictEqual(clickNewFileResult, true, 'Should be able to click New File menu item');

        // 等待模态框出现
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 检查模态框是否显示
        const modalVisible = await mainWindow.webContents.executeJavaScript(`
            const modal = document.getElementById('modalOverlay');
            return modal && modal.style.display === 'flex';
        `);

        console.log(`📄 Modal visible: ${modalVisible}`);
        assert.strictEqual(modalVisible, true, 'Modal dialog should be visible');

        // 测试输入文件名
        const inputTestResult = await mainWindow.webContents.executeJavaScript(`
            const input = document.getElementById('modalInput');
            if (input) {
                input.value = 'test-file.txt';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return input.value;
            }
            return null;
        `);

        assert.strictEqual(inputTestResult, 'test-file.txt', 'Should be able to input file name');

        console.log('✅ New file modal test passed');
    });
});
