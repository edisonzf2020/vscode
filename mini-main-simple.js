/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Mini VSCode - 从零开始的最小IDE
 * 只包含：文件资源管理器 + 编辑器
 */

const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Mini VSCode from scratch...');

// 全局变量
let mainWindow = null;

// 应用配置
const APP_CONFIG = {
    name: 'Mini VSCode',
    version: '0.1.0',
    window: {
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600
    }
};

/**
 * 创建主窗口
 */
function createMainWindow() {
    console.log('🪟 Creating main window...');

    mainWindow = new BrowserWindow({
        width: APP_CONFIG.window.width,
        height: APP_CONFIG.window.height,
        minWidth: APP_CONFIG.window.minWidth,
        minHeight: APP_CONFIG.window.minHeight,
        title: APP_CONFIG.name,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false // 开发阶段禁用，方便调试
        },
        show: false // 先不显示，等加载完成后再显示
    });

    // 加载HTML文件
    const htmlPath = path.join(__dirname, 'mini-ide.html');
    console.log('📄 Loading HTML from:', htmlPath);

    mainWindow.loadFile(htmlPath);

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        console.log('✅ Window ready to show');
        mainWindow.show();

        // 开发模式下打开开发者工具
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });

    // 窗口关闭事件
    mainWindow.on('closed', () => {
        console.log('🪟 Main window closed');
        mainWindow = null;
    });

    // 设置菜单
    setupMenu();
}

/**
 * 设置应用菜单
 */
function setupMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New File',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-new-file');
                    }
                },
                {
                    label: 'Open File',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        mainWindow.webContents.send('menu-open-file');
                    }
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu-save-file');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/**
 * 设置IPC通信
 */
function setupIPC() {
    console.log('📡 Setting up IPC communication...');

    // 读取文件
    ipcMain.handle('read-file', async (event, filePath) => {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            return { success: true, content };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // 写入文件
    ipcMain.handle('write-file', async (event, filePath, content) => {
        try {
            await fs.promises.writeFile(filePath, content, 'utf8');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // 读取目录
    ipcMain.handle('read-directory', async (event, dirPath) => {
        try {
            const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
            const result = items.map(item => ({
                name: item.name,
                isDirectory: item.isDirectory(),
                path: path.join(dirPath, item.name)
            }));
            return { success: true, items: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // 显示打开文件夹对话框
    ipcMain.handle('show-open-dialog', async (event) => {
        try {
            const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openDirectory'],
                title: 'Select Workspace Folder'
            });

            return {
                success: true,
                canceled: result.canceled,
                filePaths: result.filePaths
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

/**
 * 应用启动
 */
function onAppReady() {
    console.log('✅ Electron app ready');

    setupIPC();
    createMainWindow();

    console.log('🎉 Mini VSCode started successfully!');
}

/**
 * 应用事件处理
 */
app.whenReady().then(onAppReady);

app.on('window-all-closed', () => {
    console.log('🪟 All windows closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    console.log('🔄 App activated');
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('📋 Mini VSCode main process initialized');
