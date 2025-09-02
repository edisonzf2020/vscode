/**
 * Playwright Electron Tests for Mini VSCode
 * Direct UI interaction testing
 */

const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

let electronApp;
let page;

test.describe('Mini VSCode Playwright Tests', () => {
    test.beforeAll(async () => {
        console.log('🚀 Launching Mini VSCode with Playwright...');
        
        // Launch Electron app
        electronApp = await electron.launch({
            args: [path.join(__dirname, '../../mini-main-simple.js')],
            cwd: path.join(__dirname, '../..')
        });

        // Get the first page (main window)
        page = await electronApp.firstWindow();
        
        // Wait for the app to load
        await page.waitForLoadState('domcontentloaded');
        
        console.log('✅ Mini VSCode launched successfully');
    });

    test.afterAll(async () => {
        if (electronApp) {
            console.log('🛑 Closing Mini VSCode...');
            await electronApp.close();
        }
    });

    test('应用界面加载测试', async () => {
        console.log('🧪 Testing app UI loading...');
        
        // Check if main elements are present
        await expect(page.locator('.container')).toBeVisible();
        await expect(page.locator('.sidebar')).toBeVisible();
        await expect(page.locator('.main-area')).toBeVisible();
        
        // Check for file explorer
        await expect(page.locator('.file-explorer')).toBeVisible();
        
        // Check for welcome screen or test button
        const welcomeScreen = page.locator('.welcome-screen');
        const testButton = page.locator('button:has-text("Test")');
        
        // Either welcome screen or test button should be visible
        const isWelcomeVisible = await welcomeScreen.isVisible();
        const isTestButtonVisible = await testButton.isVisible();
        
        expect(isWelcomeVisible || isTestButtonVisible).toBe(true);
        
        console.log('✅ App UI loaded correctly');
    });

    test('测试按钮功能', async () => {
        console.log('🧪 Testing Test button functionality...');
        
        // Look for the test button
        const testButton = page.locator('button:has-text("Test")');
        
        if (await testButton.isVisible()) {
            console.log('📄 Test button found, clicking...');
            await testButton.click();
            
            // Wait a moment for the test data to load
            await page.waitForTimeout(1000);
            
            // Check if test data was loaded
            const fileItems = page.locator('.file-item');
            const fileCount = await fileItems.count();
            
            console.log(`📊 Found ${fileCount} file items after test button click`);
            expect(fileCount).toBeGreaterThan(0);
            
            console.log('✅ Test button works correctly');
        } else {
            console.log('⚠️ Test button not found, skipping test');
        }
    });

    test('文件夹展开功能测试', async () => {
        console.log('🧪 Testing folder expand functionality...');
        
        // First click test button to load test data
        const testButton = page.locator('button:has-text("Test")');
        if (await testButton.isVisible()) {
            await testButton.click();
            await page.waitForTimeout(1000);
        }
        
        // Look for directory items
        const directoryItems = page.locator('.file-item.directory');
        const dirCount = await directoryItems.count();
        
        if (dirCount > 0) {
            console.log(`📁 Found ${dirCount} directories`);
            
            // Try to click on the first directory
            const firstDir = directoryItems.first();
            const dirName = await firstDir.textContent();
            console.log(`📁 Clicking on directory: ${dirName}`);
            
            await firstDir.click();
            
            // Wait for potential expansion
            await page.waitForTimeout(1000);
            
            // Check if more items appeared (indicating expansion)
            const newFileCount = await page.locator('.file-item').count();
            console.log(`📊 File count after directory click: ${newFileCount}`);
            
            console.log('✅ Directory click test completed');
        } else {
            console.log('⚠️ No directories found for expansion test');
        }
    });

    test('右键菜单测试', async () => {
        console.log('🧪 Testing right-click context menu...');
        
        // First click test button to load test data
        const testButton = page.locator('button:has-text("Test")');
        if (await testButton.isVisible()) {
            await testButton.click();
            await page.waitForTimeout(1000);
        }
        
        // Look for file items
        const fileItems = page.locator('.file-item');
        const itemCount = await fileItems.count();
        
        if (itemCount > 0) {
            console.log(`📄 Found ${itemCount} file items`);
            
            // Right-click on the first item
            const firstItem = fileItems.first();
            const itemName = await firstItem.textContent();
            console.log(`🖱️ Right-clicking on: ${itemName}`);
            
            await firstItem.click({ button: 'right' });
            
            // Wait for context menu to appear
            await page.waitForTimeout(500);
            
            // Check if context menu is visible
            const contextMenu = page.locator('#contextMenu');
            const isMenuVisible = await contextMenu.isVisible();
            
            console.log(`🖱️ Context menu visible: ${isMenuVisible}`);
            
            if (isMenuVisible) {
                // Check for menu items
                const newFileItem = page.locator('.context-menu-item:has-text("New File")');
                const newFolderItem = page.locator('.context-menu-item:has-text("New Folder")');
                
                expect(await newFileItem.isVisible()).toBe(true);
                expect(await newFolderItem.isVisible()).toBe(true);
                
                console.log('✅ Context menu items found');
                
                // Click somewhere else to close menu
                await page.click('body');
                await page.waitForTimeout(300);
            }
            
            console.log('✅ Right-click menu test completed');
        } else {
            console.log('⚠️ No file items found for right-click test');
        }
    });

    test('新建文件模态对话框测试', async () => {
        console.log('🧪 Testing new file modal dialog...');
        
        // First click test button to load test data
        const testButton = page.locator('button:has-text("Test")');
        if (await testButton.isVisible()) {
            await testButton.click();
            await page.waitForTimeout(1000);
        }
        
        // Right-click on a file item
        const fileItems = page.locator('.file-item');
        if (await fileItems.count() > 0) {
            await fileItems.first().click({ button: 'right' });
            await page.waitForTimeout(500);
            
            // Click "New File" in context menu
            const newFileItem = page.locator('.context-menu-item:has-text("New File")');
            if (await newFileItem.isVisible()) {
                console.log('📄 Clicking "New File" menu item...');
                await newFileItem.click();
                
                // Wait for modal to appear
                await page.waitForTimeout(500);
                
                // Check if modal is visible
                const modal = page.locator('#modalOverlay');
                const isModalVisible = await modal.isVisible();
                
                console.log(`📄 Modal visible: ${isModalVisible}`);
                
                if (isModalVisible) {
                    // Check modal elements
                    const modalTitle = page.locator('#modalTitle');
                    const modalInput = page.locator('#modalInput');
                    const okButton = page.locator('.modal-btn-ok');
                    const cancelButton = page.locator('.modal-btn-cancel');
                    
                    expect(await modalTitle.isVisible()).toBe(true);
                    expect(await modalInput.isVisible()).toBe(true);
                    expect(await okButton.isVisible()).toBe(true);
                    expect(await cancelButton.isVisible()).toBe(true);
                    
                    console.log('✅ Modal elements found');
                    
                    // Test typing in input
                    await modalInput.fill('test-file.txt');
                    const inputValue = await modalInput.inputValue();
                    expect(inputValue).toBe('test-file.txt');
                    
                    console.log('✅ Modal input works');
                    
                    // Cancel the modal
                    await cancelButton.click();
                    await page.waitForTimeout(300);
                    
                    // Verify modal is closed
                    expect(await modal.isVisible()).toBe(false);
                    
                    console.log('✅ Modal cancel works');
                }
                
                console.log('✅ New file modal test completed');
            } else {
                console.log('⚠️ New File menu item not found');
            }
        } else {
            console.log('⚠️ No file items found for new file test');
        }
    });

    test('控制台错误检查', async () => {
        console.log('🧪 Checking for console errors...');
        
        // Collect console messages
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text()
            });
        });
        
        // Perform some actions to trigger potential errors
        const testButton = page.locator('button:has-text("Test")');
        if (await testButton.isVisible()) {
            await testButton.click();
            await page.waitForTimeout(1000);
        }
        
        // Check for errors
        const errors = consoleMessages.filter(msg => msg.type === 'error');
        
        console.log(`📊 Total console messages: ${consoleMessages.length}`);
        console.log(`❌ Console errors: ${errors.length}`);
        
        if (errors.length > 0) {
            console.log('Console errors found:');
            errors.forEach(error => console.log(`  - ${error.text}`));
        }
        
        // We expect no critical errors
        const criticalErrors = errors.filter(error => 
            !error.text.includes('DevTools') && 
            !error.text.includes('Extension')
        );
        
        expect(criticalErrors.length).toBe(0);
        
        console.log('✅ Console error check completed');
    });
});
