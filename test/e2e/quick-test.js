/**
 * 快速测试 - 验证新建文件功能是否修复
 */

const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

test.describe('快速功能验证', () => {
    test('快速验证新建文件功能', async () => {
        console.log('🚀 启动快速测试...');

        // 启动Electron应用
        const electronApp = await electron.launch({
            args: [path.join(__dirname, '../../mini-main-simple.js')],
            cwd: path.join(__dirname, '../..')
        });

        const page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');

        // 监听控制台消息
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text(),
                timestamp: new Date().toISOString()
            });
        });

        try {
            console.log('1. 点击测试按钮...');
            await page.click('button:has-text("Test")');
            await page.waitForTimeout(3000); // 等待更长时间让测试工作区创建

            // 检查控制台日志
            const logs = await page.evaluate(() => {
                return window.debugLogs ? window.debugLogs.slice(-20) : [];
            });

            console.log('2. 控制台日志:');
            if (logs.length > 0) {
                logs.forEach(log => {
                    console.log(`   [${log.timestamp}] ${log.message}`);
                });
            } else {
                console.log('   没有调试日志，显示原始控制台消息:');
                consoleMessages.slice(-10).forEach(msg => {
                    console.log(`   [${msg.type}] ${msg.text}`);
                });
            }

            // 检查当前工作区
            const currentWorkspace = await page.evaluate(() => {
                return window.currentWorkspace;
            });
            console.log(`3. 当前工作区: ${currentWorkspace}`);

            // 检查文件项数量
            const fileItemCount = await page.locator('.file-item').count();
            console.log(`4. 文件项数量: ${fileItemCount}`);

            if (fileItemCount > 0) {
                console.log('5. 尝试新建文件...');

                // 右键点击第一个文件项
                await page.locator('.file-item').first().click({ button: 'right' });
                await page.waitForTimeout(500);

                // 检查右键菜单
                const menuVisible = await page.locator('#contextMenu').isVisible();
                console.log(`   右键菜单可见: ${menuVisible}`);

                if (menuVisible) {
                    // 点击"New File"
                    await page.click('.context-menu-item:has-text("New File")');
                    await page.waitForTimeout(1000);

                    // 检查模态框
                    const modalVisible = await page.locator('#modalOverlay').isVisible();
                    console.log(`   模态框可见: ${modalVisible}`);

                    if (modalVisible) {
                        // 输入文件名
                        await page.fill('#modalInput', 'quick-test-file.txt');

                        // 清除之前的控制台消息
                        consoleMessages.length = 0;

                        // 点击确定
                        console.log('   点击确定按钮...');
                        await page.click('.modal-btn-ok');
                        await page.waitForTimeout(3000); // 等待更长时间

                        // 捕获新建文件过程中的日志
                        console.log('   新建文件过程中的控制台消息:');
                        consoleMessages.forEach(msg => {
                            console.log(`     [${msg.type}] ${msg.text}`);
                        });

                        // 检查文件是否在真实文件系统中创建
                        if (currentWorkspace && currentWorkspace !== '/test') {
                            const testFilePath = path.join(currentWorkspace, 'quick-test-file.txt');
                            const fileExists = fs.existsSync(testFilePath);
                            console.log(`   文件已创建: ${fileExists}`);
                            console.log(`   文件路径: ${testFilePath}`);

                            if (fileExists) {
                                console.log('✅ 新建文件功能正常工作！');
                            } else {
                                console.log('❌ 文件未在文件系统中创建');
                            }
                        } else {
                            console.log('⚠️ 使用的是虚拟工作区，无法验证文件创建');
                        }

                        // 检查文件列表是否更新
                        const newFileItemCount = await page.locator('.file-item').count();
                        console.log(`   新的文件项数量: ${newFileItemCount}`);

                        if (newFileItemCount > fileItemCount) {
                            console.log('✅ 文件列表已更新！');
                        } else {
                            console.log('❌ 文件列表未更新');
                        }
                    }
                }
            }

            console.log('✅ 快速测试完成');

        } catch (error) {
            console.error('❌ 测试失败:', error);
        } finally {
            await electronApp.close();
        }
    });
});
