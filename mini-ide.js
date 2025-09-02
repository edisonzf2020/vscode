/**
 * Mini VSCode - 前端JavaScript
 * 处理文件资源管理器和编辑器的交互
 */

const { ipcRenderer } = require('electron');
const { dialog } = require('@electron/remote');
const path = require('path');

// 全局状态
let currentWorkspace = null;
let openFiles = new Map(); // 存储打开的文件
let activeFile = null;

// DOM元素
const fileExplorer = document.getElementById('fileExplorer');
const tabBar = document.getElementById('tabBar');
const editor = document.getElementById('editor');
const welcomeScreen = document.getElementById('welcomeScreen');
const statusText = document.getElementById('statusText');

console.log('🎯 Mini IDE frontend initialized');

/**
 * 打开文件夹
 */
async function openFolder() {
    try {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Workspace Folder'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const folderPath = result.filePaths[0];
            console.log('📁 Opening folder:', folderPath);
            
            currentWorkspace = folderPath;
            await loadWorkspace(folderPath);
            updateStatus(`Opened: ${path.basename(folderPath)}`);
        }
    } catch (error) {
        console.error('❌ Error opening folder:', error);
        updateStatus('Error opening folder');
    }
}

/**
 * 加载工作区
 */
async function loadWorkspace(folderPath) {
    try {
        const result = await ipcRenderer.invoke('read-directory', folderPath);
        
        if (result.success) {
            renderFileExplorer(result.items, folderPath);
        } else {
            console.error('❌ Error loading workspace:', result.error);
            updateStatus('Error loading workspace');
        }
    } catch (error) {
        console.error('❌ Error loading workspace:', error);
        updateStatus('Error loading workspace');
    }
}

/**
 * 渲染文件资源管理器
 */
function renderFileExplorer(items, basePath) {
    fileExplorer.innerHTML = '';
    
    // 添加工作区根目录
    const rootItem = document.createElement('div');
    rootItem.className = 'file-item directory';
    rootItem.textContent = path.basename(basePath);
    rootItem.style.fontWeight = 'bold';
    rootItem.style.marginBottom = '5px';
    fileExplorer.appendChild(rootItem);

    // 排序：目录在前，文件在后
    const sortedItems = items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    });

    // 渲染文件和目录
    sortedItems.forEach(item => {
        const fileItem = document.createElement('div');
        fileItem.className = `file-item ${item.isDirectory ? 'directory' : 'file'}`;
        fileItem.textContent = item.name;
        fileItem.style.paddingLeft = '20px';
        
        if (!item.isDirectory) {
            fileItem.addEventListener('click', () => openFile(item.path));
        } else {
            fileItem.addEventListener('click', () => toggleDirectory(item.path, fileItem));
        }
        
        fileExplorer.appendChild(fileItem);
    });
}

/**
 * 打开文件
 */
async function openFile(filePath) {
    try {
        console.log('📄 Opening file:', filePath);
        
        // 如果文件已经打开，直接切换到该标签
        if (openFiles.has(filePath)) {
            switchToFile(filePath);
            return;
        }

        const result = await ipcRenderer.invoke('read-file', filePath);
        
        if (result.success) {
            // 添加到打开文件列表
            openFiles.set(filePath, {
                content: result.content,
                originalContent: result.content,
                modified: false
            });

            // 创建标签页
            createTab(filePath);
            
            // 切换到新文件
            switchToFile(filePath);
            
            updateStatus(`Opened: ${path.basename(filePath)}`);
        } else {
            console.error('❌ Error opening file:', result.error);
            updateStatus('Error opening file');
        }
    } catch (error) {
        console.error('❌ Error opening file:', error);
        updateStatus('Error opening file');
    }
}

/**
 * 创建标签页
 */
function createTab(filePath) {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.filePath = filePath;
    
    const fileName = path.basename(filePath);
    tab.innerHTML = `
        <span class="tab-name">${fileName}</span>
        <span class="close-btn" onclick="closeFile('${filePath}')">&times;</span>
    `;
    
    tab.addEventListener('click', (e) => {
        if (!e.target.classList.contains('close-btn')) {
            switchToFile(filePath);
        }
    });
    
    tabBar.appendChild(tab);
}

/**
 * 切换到指定文件
 */
function switchToFile(filePath) {
    // 保存当前文件内容
    if (activeFile && openFiles.has(activeFile)) {
        const fileData = openFiles.get(activeFile);
        fileData.content = editor.value;
        fileData.modified = fileData.content !== fileData.originalContent;
        updateTabModifiedState(activeFile);
    }

    // 切换到新文件
    activeFile = filePath;
    const fileData = openFiles.get(filePath);
    
    // 更新编辑器内容
    editor.value = fileData.content;
    editor.style.display = 'block';
    welcomeScreen.style.display = 'none';
    
    // 更新标签页状态
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filePath === filePath) {
            tab.classList.add('active');
        }
    });
    
    // 聚焦编辑器
    editor.focus();
    
    updateStatus(`Editing: ${path.basename(filePath)}`);
}

/**
 * 关闭文件
 */
function closeFile(filePath) {
    const fileData = openFiles.get(filePath);
    
    // 如果文件已修改，询问是否保存
    if (fileData && fileData.modified) {
        const result = confirm(`Save changes to ${path.basename(filePath)}?`);
        if (result) {
            saveFile(filePath);
        }
    }
    
    // 移除标签页
    const tab = document.querySelector(`[data-file-path="${filePath}"]`);
    if (tab) {
        tab.remove();
    }
    
    // 从打开文件列表中移除
    openFiles.delete(filePath);
    
    // 如果关闭的是当前活动文件
    if (activeFile === filePath) {
        activeFile = null;
        
        // 如果还有其他打开的文件，切换到第一个
        if (openFiles.size > 0) {
            const firstFile = openFiles.keys().next().value;
            switchToFile(firstFile);
        } else {
            // 没有打开的文件，显示欢迎屏幕
            editor.style.display = 'none';
            welcomeScreen.style.display = 'flex';
            updateStatus('Ready');
        }
    }
}

/**
 * 保存文件
 */
async function saveFile(filePath = activeFile) {
    if (!filePath || !openFiles.has(filePath)) return;
    
    try {
        const fileData = openFiles.get(filePath);
        const content = activeFile === filePath ? editor.value : fileData.content;
        
        const result = await ipcRenderer.invoke('write-file', filePath, content);
        
        if (result.success) {
            fileData.content = content;
            fileData.originalContent = content;
            fileData.modified = false;
            updateTabModifiedState(filePath);
            updateStatus(`Saved: ${path.basename(filePath)}`);
        } else {
            console.error('❌ Error saving file:', result.error);
            updateStatus('Error saving file');
        }
    } catch (error) {
        console.error('❌ Error saving file:', error);
        updateStatus('Error saving file');
    }
}

/**
 * 更新标签页修改状态
 */
function updateTabModifiedState(filePath) {
    const tab = document.querySelector(`[data-file-path="${filePath}"]`);
    if (tab) {
        const fileData = openFiles.get(filePath);
        const tabName = tab.querySelector('.tab-name');
        const fileName = path.basename(filePath);
        
        if (fileData.modified) {
            tabName.textContent = `● ${fileName}`;
        } else {
            tabName.textContent = fileName;
        }
    }
}

/**
 * 更新状态栏
 */
function updateStatus(message) {
    statusText.textContent = message;
    console.log('📊 Status:', message);
}

/**
 * 事件监听器
 */

// 编辑器内容变化
editor.addEventListener('input', () => {
    if (activeFile && openFiles.has(activeFile)) {
        const fileData = openFiles.get(activeFile);
        fileData.content = editor.value;
        fileData.modified = fileData.content !== fileData.originalContent;
        updateTabModifiedState(activeFile);
    }
});

// 菜单事件监听
ipcRenderer.on('menu-new-file', () => {
    console.log('📄 New file requested');
    // TODO: 实现新建文件功能
});

ipcRenderer.on('menu-open-file', () => {
    console.log('📁 Open file requested');
    openFolder();
});

ipcRenderer.on('menu-save-file', () => {
    console.log('💾 Save file requested');
    if (activeFile) {
        saveFile();
    }
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 's':
                e.preventDefault();
                if (activeFile) {
                    saveFile();
                }
                break;
            case 'o':
                e.preventDefault();
                openFolder();
                break;
        }
    }
});

console.log('✅ Mini IDE frontend ready!');
