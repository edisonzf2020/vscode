/**
 * GUI调试测试 - 使用Playwright直接测试GUI问题
 */

const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

test.describe('GUI问题调试', () => {
    let electronApp;
    let page;

    test.beforeAll(async () => {
        console.log('🚀 启动Electron应用进行GUI调试...');
        
        // 启动Electron应用
        electronApp = await electron.launch({
            args: [path.join(__dirname, '../../mini-main-simple.js')],
            cwd: path.join(__dirname, '../..')
        });

        // 获取主窗口
        page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');
        
        console.log('✅ Electron应用已启动');
    });

    test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test('调试新建文件功能', async () => {
        console.log('🔍 调试新建文件功能...');
        
        // 1. 点击测试按钮加载数据
        console.log('1. 点击测试按钮...');
        await page.click('button:has-text("Test")');
        await page.waitForTimeout(1000);
        
        // 2. 检查文件项是否存在
        const fileItems = await page.locator('.file-item').count();
        console.log(`2. 找到 ${fileItems} 个文件项`);
        
        if (fileItems === 0) {
            console.log('❌ 没有文件项，测试按钮可能没有工作');
            return;
        }
        
        // 3. 右键点击第一个文件项
        console.log('3. 右键点击第一个文件项...');
        await page.locator('.file-item').first().click({ button: 'right' });
        await page.waitForTimeout(500);
        
        // 4. 检查右键菜单是否显示
        const menuVisible = await page.locator('#contextMenu').isVisible();
        console.log(`4. 右键菜单可见: ${menuVisible}`);
        
        if (!menuVisible) {
            console.log('❌ 右键菜单没有显示');
            return;
        }
        
        // 5. 点击"New File"
        console.log('5. 点击"New File"菜单项...');
        await page.click('.context-menu-item:has-text("New File")');
        await page.waitForTimeout(1000);
        
        // 6. 检查模态框是否显示
        const modalVisible = await page.locator('#modalOverlay').isVisible();
        console.log(`6. 模态框可见: ${modalVisible}`);
        
        if (!modalVisible) {
            console.log('❌ 模态框没有显示');
            return;
        }
        
        // 7. 输入文件名
        console.log('7. 输入文件名...');
        await page.fill('#modalInput', 'debug-test-file.txt');
        
        // 8. 点击确定
        console.log('8. 点击确定按钮...');
        await page.click('.modal-btn-ok');
        await page.waitForTimeout(2000);
        
        // 9. 检查模态框是否关闭
        const modalClosed = !(await page.locator('#modalOverlay').isVisible());
        console.log(`9. 模态框已关闭: ${modalClosed}`);
        
        // 10. 检查文件是否被创建（在文件系统中）
        console.log('10. 检查文件系统中是否有新文件...');
        const testWorkspace = path.join(__dirname, '../../test-workspace');
        if (fs.existsSync(testWorkspace)) {
            const files = fs.readdirSync(testWorkspace);
            console.log(`    工作区文件: ${files.join(', ')}`);
            
            const hasNewFile = files.includes('debug-test-file.txt');
            console.log(`    新文件已创建: ${hasNewFile}`);
        } else {
            console.log('    测试工作区不存在');
        }
        
        // 11. 检查文件列表是否更新
        const newFileItemCount = await page.locator('.file-item').count();
        console.log(`11. 新的文件项数量: ${newFileItemCount}`);
        
        // 12. 捕获控制台日志
        console.log('12. 捕获控制台日志...');
        const logs = await page.evaluate(() => {
            return window.debugLogs || [];
        });
        
        if (logs.length > 0) {
            console.log('    控制台日志:');
            logs.slice(-10).forEach(log => {
                console.log(`    [${log.timestamp}] ${log.message}`);
            });
        }
        
        console.log('✅ 新建文件调试完成');
    });

    test('调试文件夹展开功能', async () => {
        console.log('🔍 调试文件夹展开功能...');
        
        // 1. 点击测试按钮加载数据
        console.log('1. 点击测试按钮...');
        await page.click('button:has-text("Test")');
        await page.waitForTimeout(1000);
        
        // 2. 查找目录项
        const directories = await page.locator('.file-item.directory').count();
        console.log(`2. 找到 ${directories} 个目录`);
        
        if (directories === 0) {
            console.log('❌ 没有找到目录项');
            return;
        }
        
        // 3. 检查第一个目录的展开图标
        const firstDir = page.locator('.file-item.directory').first();
        const expandIcon = firstDir.locator('.expand-icon');
        
        const hasExpandIcon = await expandIcon.count() > 0;
        console.log(`3. 第一个目录有展开图标: ${hasExpandIcon}`);
        
        if (hasExpandIcon) {
            const iconText = await expandIcon.textContent();
            console.log(`   展开图标内容: "${iconText}"`);
            
            const iconVisible = await expandIcon.isVisible();
            console.log(`   展开图标可见: ${iconVisible}`);
        }
        
        // 4. 点击目录
        console.log('4. 点击第一个目录...');
        const initialFileCount = await page.locator('.file-item').count();
        console.log(`   点击前文件数量: ${initialFileCount}`);
        
        await firstDir.click();
        await page.waitForTimeout(1000);
        
        const finalFileCount = await page.locator('.file-item').count();
        console.log(`   点击后文件数量: ${finalFileCount}`);
        
        // 5. 检查展开状态
        const isExpanded = await firstDir.evaluate(el => el.classList.contains('expanded'));
        console.log(`5. 目录展开状态: ${isExpanded}`);
        
        // 6. 检查展开图标是否改变
        if (hasExpandIcon) {
            const newIconText = await expandIcon.textContent();
            console.log(`6. 新的展开图标内容: "${newIconText}"`);
        }
        
        console.log('✅ 文件夹展开调试完成');
    });

    test('捕获所有错误和日志', async () => {
        console.log('🔍 捕获所有错误和日志...');
        
        // 监听控制台消息
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text(),
                timestamp: new Date().toISOString()
            });
        });
        
        // 监听页面错误
        const pageErrors = [];
        page.on('pageerror', error => {
            pageErrors.push({
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        });
        
        // 执行一些操作
        await page.click('button:has-text("Test")');
        await page.waitForTimeout(1000);
        
        // 尝试右键点击
        const fileItems = await page.locator('.file-item').count();
        if (fileItems > 0) {
            await page.locator('.file-item').first().click({ button: 'right' });
            await page.waitForTimeout(500);
        }
        
        // 输出所有捕获的信息
        console.log('\n📋 控制台消息:');
        consoleMessages.forEach(msg => {
            console.log(`  [${msg.type}] ${msg.text}`);
        });
        
        console.log('\n❌ 页面错误:');
        if (pageErrors.length === 0) {
            console.log('  无页面错误');
        } else {
            pageErrors.forEach(error => {
                console.log(`  ${error.message}`);
            });
        }
        
        console.log('✅ 错误和日志捕获完成');
    });
});
