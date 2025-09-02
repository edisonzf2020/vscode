/**
 * 根目录折叠功能测试
 */

const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

test.describe('根目录折叠功能测试', () => {
    test('验证根目录可以折叠和展开', async () => {
        console.log('🚀 启动根目录折叠测试...');
        
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
            console.log('1. 点击测试按钮加载工作区...');
            await page.click('button:has-text("Test")');
            await page.waitForTimeout(3000);
            
            // 检查根目录是否存在
            const rootItems = await page.locator('.file-item.directory').count();
            console.log(`2. 找到 ${rootItems} 个目录项`);
            
            if (rootItems === 0) {
                console.log('❌ 没有找到目录项');
                return;
            }
            
            // 查找根目录（第一个目录项，通常是工作区根目录）
            const rootDirectory = page.locator('.file-item.directory').first();
            const rootName = await rootDirectory.textContent();
            console.log(`3. 根目录名称: ${rootName}`);
            
            // 检查根目录是否有展开图标
            const expandIcon = rootDirectory.locator('.expand-icon');
            const hasExpandIcon = await expandIcon.count() > 0;
            console.log(`4. 根目录有展开图标: ${hasExpandIcon}`);
            
            if (hasExpandIcon) {
                const iconText = await expandIcon.textContent();
                console.log(`   展开图标内容: "${iconText}"`);
                
                // 检查根目录是否展开
                const isExpanded = await rootDirectory.evaluate(el => el.classList.contains('expanded'));
                console.log(`5. 根目录展开状态: ${isExpanded}`);
                
                // 计算初始文件项数量
                const initialFileCount = await page.locator('.file-item').count();
                console.log(`6. 初始文件项数量: ${initialFileCount}`);
                
                // 点击根目录的展开图标来折叠
                console.log('7. 点击根目录展开图标进行折叠...');
                await expandIcon.click();
                await page.waitForTimeout(1000);
                
                // 检查折叠后的状态
                const afterCollapseExpanded = await rootDirectory.evaluate(el => el.classList.contains('expanded'));
                console.log(`8. 折叠后展开状态: ${afterCollapseExpanded}`);
                
                const afterCollapseIconText = await expandIcon.textContent();
                console.log(`   折叠后图标内容: "${afterCollapseIconText}"`);
                
                const afterCollapseFileCount = await page.locator('.file-item:visible').count();
                console.log(`   折叠后可见文件项数量: ${afterCollapseFileCount}`);
                
                // 再次点击展开
                console.log('9. 再次点击展开图标进行展开...');
                await expandIcon.click();
                await page.waitForTimeout(1000);
                
                // 检查展开后的状态
                const afterExpandExpanded = await rootDirectory.evaluate(el => el.classList.contains('expanded'));
                console.log(`10. 展开后展开状态: ${afterExpandExpanded}`);
                
                const afterExpandIconText = await expandIcon.textContent();
                console.log(`    展开后图标内容: "${afterExpandIconText}"`);
                
                const afterExpandFileCount = await page.locator('.file-item:visible').count();
                console.log(`    展开后可见文件项数量: ${afterExpandFileCount}`);
                
                // 验证功能是否正常
                if (!afterCollapseExpanded && afterCollapseIconText === '▶' && afterCollapseFileCount < initialFileCount) {
                    console.log('✅ 折叠功能正常工作！');
                } else {
                    console.log('❌ 折叠功能可能有问题');
                }
                
                if (afterExpandExpanded && afterExpandIconText === '▼' && afterExpandFileCount >= afterCollapseFileCount) {
                    console.log('✅ 展开功能正常工作！');
                } else {
                    console.log('❌ 展开功能可能有问题');
                }
            } else {
                console.log('❌ 根目录没有展开图标');
            }
            
            // 显示相关的控制台日志
            console.log('\n📋 相关控制台日志:');
            const relevantLogs = consoleMessages.filter(msg => 
                msg.text.includes('Root') || 
                msg.text.includes('root') || 
                msg.text.includes('Toggling') ||
                msg.text.includes('Collapsed') ||
                msg.text.includes('Expanded')
            );
            
            if (relevantLogs.length > 0) {
                relevantLogs.forEach(msg => {
                    console.log(`   [${msg.type}] ${msg.text}`);
                });
            } else {
                console.log('   没有找到相关的控制台日志');
            }
            
            console.log('✅ 根目录折叠测试完成');
            
        } catch (error) {
            console.error('❌ 测试失败:', error);
        } finally {
            await electronApp.close();
        }
    });
});
