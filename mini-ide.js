/**
 * Mini VSCode - 前端JavaScript
 * 处理文件资源管理器和编辑器的交互
 */

const { ipcRenderer } = require('electron');
const path = require('path');

// 全局状态
let currentWorkspace = null;
let openFiles = new Map(); // 存储打开的文件
let activeFile = null;
let expandedDirectories = new Set(); // 存储展开的目录
let fileTree = new Map(); // 存储文件树结构

// DOM元素
const fileExplorer = document.getElementById('fileExplorer');
const tabBar = document.getElementById('tabBar');
const editor = document.getElementById('editor');
const welcomeScreen = document.getElementById('welcomeScreen');
const statusText = document.getElementById('statusText');

console.log('🎯 Mini IDE frontend initialized');

/**
 * 获取文件扩展名
 */
function getFileExtension(fileName) {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : '';
}

/**
 * 获取文件类型CSS类
 */
function getFileTypeClass(fileName) {
    const ext = getFileExtension(fileName);
    const typeMap = {
        'js': 'js',
        'ts': 'ts',
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'scss': 'css',
        'sass': 'css',
        'md': 'md',
        'markdown': 'md',
        'json': 'json',
        'txt': 'txt',
        'py': 'py',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'h': 'c'
    };
    return typeMap[ext] || 'file';
}

/**
 * 测试函数
 */
function testFunction() {
    console.log('🧪 Test function called');
    updateStatus('Test function executed');

    // 测试创建一个简单的文件列表
    const testItems = [
        { name: 'test.txt', isDirectory: false, path: '/test/test.txt' },
        { name: 'folder1', isDirectory: true, path: '/test/folder1' },
        { name: 'script.js', isDirectory: false, path: '/test/script.js' }
    ];

    renderFileExplorer(testItems, '/test');
}

/**
 * 打开文件夹
 */
async function openFolder() {
    try {
        console.log('📁 Requesting folder selection...');
        const result = await ipcRenderer.invoke('show-open-dialog');

        if (result.success && result.filePaths && result.filePaths.length > 0) {
            const folderPath = result.filePaths[0];
            console.log('📁 Opening folder:', folderPath);

            currentWorkspace = folderPath;
            await loadWorkspace(folderPath);
            updateStatus(`Opened: ${path.basename(folderPath)}`);
        } else if (result.canceled) {
            console.log('📁 Folder selection canceled');
        } else {
            console.error('❌ Error in folder selection:', result.error);
            updateStatus('Error opening folder');
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
            // 存储根目录内容到文件树
            fileTree.set(folderPath, result.items);
            // 默认展开根目录
            expandedDirectories.add(folderPath);
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
function renderFileExplorer(items, basePath, level = 0) {
    console.log('🎨 Rendering file explorer with', items.length, 'items at level', level);

    if (level === 0) {
        fileExplorer.innerHTML = '';

        // 添加工作区根目录
        const rootItem = document.createElement('div');
        rootItem.className = 'file-item directory expanded';
        rootItem.style.fontWeight = 'bold';
        rootItem.style.marginBottom = '5px';
        rootItem.style.paddingLeft = '5px';
        rootItem.textContent = path.basename(basePath);

        // 添加右键菜单支持
        rootItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, basePath, true);
        });

        fileExplorer.appendChild(rootItem);
    }

    // 排序：目录在前，文件在后
    const sortedItems = items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    });

    // 渲染文件和目录
    sortedItems.forEach(item => {
        const fileItem = document.createElement('div');
        const paddingLeft = 20 + (level * 20);

        if (item.isDirectory) {
            fileItem.className = 'file-item directory';
            const isExpanded = expandedDirectories.has(item.path);
            if (isExpanded) {
                fileItem.classList.add('expanded');
            }

            // 添加展开图标
            const expandIcon = document.createElement('span');
            expandIcon.className = 'expand-icon';
            expandIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDirectory(item.path);
            });
            fileItem.appendChild(expandIcon);

            fileItem.addEventListener('click', () => {
                console.log('📁 Directory clicked:', item.name);
                toggleDirectory(item.path);
            });
        } else {
            const fileType = getFileTypeClass(item.name);
            fileItem.className = `file-item file ${fileType}`;

            fileItem.addEventListener('click', () => {
                console.log('📄 File clicked:', item.name);
                openFile(item.path);
            });
        }

        fileItem.textContent = item.name;
        fileItem.style.paddingLeft = `${paddingLeft}px`;
        fileItem.dataset.path = item.path;
        fileItem.dataset.isDirectory = item.isDirectory;

        // 添加右键菜单支持
        fileItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, item.path, item.isDirectory);
        });

        fileExplorer.appendChild(fileItem);

        // 如果是展开的目录，递归渲染子项
        if (item.isDirectory && expandedDirectories.has(item.path)) {
            const children = fileTree.get(item.path);
            if (children) {
                renderFileExplorer(children, item.path, level + 1);
            }
        }
    });

    if (level === 0) {
        console.log('✅ File explorer rendered successfully');
    }
}

/**
 * 切换目录展开/折叠状态
 */
async function toggleDirectory(dirPath) {
    console.log('📁 Toggling directory:', dirPath);

    if (expandedDirectories.has(dirPath)) {
        // 折叠目录
        expandedDirectories.delete(dirPath);
        console.log('📁 Collapsed directory:', dirPath);
    } else {
        // 展开目录
        expandedDirectories.add(dirPath);

        // 如果还没有加载过这个目录的内容，先加载
        if (!fileTree.has(dirPath)) {
            try {
                const result = await ipcRenderer.invoke('read-directory', dirPath);
                if (result.success) {
                    fileTree.set(dirPath, result.items);
                } else {
                    console.error('❌ Error loading directory:', result.error);
                    expandedDirectories.delete(dirPath); // 加载失败时取消展开
                    return;
                }
            } catch (error) {
                console.error('❌ Error loading directory:', error);
                expandedDirectories.delete(dirPath);
                return;
            }
        }

        console.log('📁 Expanded directory:', dirPath);
    }

    // 重新渲染文件资源管理器
    if (currentWorkspace) {
        const rootItems = fileTree.get(currentWorkspace);
        if (rootItems) {
            renderFileExplorer(rootItems, currentWorkspace);
        }
    }
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

/**
 * 显示右键菜单
 */
function showContextMenu(x, y, targetPath, isDirectory) {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;

    // 存储当前右键点击的路径
    contextMenu.dataset.targetPath = targetPath;
    contextMenu.dataset.isDirectory = isDirectory;
}

/**
 * 隐藏右键菜单
 */
function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'none';
}

/**
 * 创建新文件
 */
async function createNewFile() {
    const contextMenu = document.getElementById('contextMenu');
    const targetPath = contextMenu.dataset.targetPath;
    const isDirectory = contextMenu.dataset.isDirectory === 'true';

    hideContextMenu();

    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    try {
        // 确定文件路径
        const filePath = isDirectory ?
            path.join(targetPath, fileName) :
            path.join(path.dirname(targetPath), fileName);

        // 创建空文件
        const result = await ipcRenderer.invoke('write-file', filePath, '');

        if (result.success) {
            console.log('✅ Created new file:', filePath);
            updateStatus(`Created: ${fileName}`);

            // 刷新文件资源管理器
            await refreshExplorer();
        } else {
            console.error('❌ Error creating file:', result.error);
            updateStatus('Error creating file');
            alert('Error creating file: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error creating file:', error);
        updateStatus('Error creating file');
        alert('Error creating file: ' + error.message);
    }
}

/**
 * 创建新文件夹
 */
async function createNewFolder() {
    const contextMenu = document.getElementById('contextMenu');
    const targetPath = contextMenu.dataset.targetPath;
    const isDirectory = contextMenu.dataset.isDirectory === 'true';

    hideContextMenu();

    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
        // 确定文件夹路径
        const folderPath = isDirectory ?
            path.join(targetPath, folderName) :
            path.join(path.dirname(targetPath), folderName);

        // 创建文件夹
        const result = await ipcRenderer.invoke('create-directory', folderPath);

        if (result.success) {
            console.log('✅ Created new folder:', folderPath);
            updateStatus(`Created: ${folderName}/`);

            // 刷新文件资源管理器
            await refreshExplorer();
        } else {
            console.error('❌ Error creating folder:', result.error);
            updateStatus('Error creating folder');
            alert('Error creating folder: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error creating folder:', error);
        updateStatus('Error creating folder');
        alert('Error creating folder: ' + error.message);
    }
}

/**
 * 刷新文件资源管理器
 */
async function refreshExplorer() {
    if (currentWorkspace) {
        console.log('🔄 Refreshing file explorer');

        // 清除缓存的文件树
        fileTree.clear();
        expandedDirectories.clear();

        // 重新加载工作区
        await loadWorkspace(currentWorkspace);

        updateStatus('Explorer refreshed');
    }
}

// 点击其他地方隐藏右键菜单
document.addEventListener('click', hideContextMenu);

// 阻止默认右键菜单
document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.file-item')) {
        e.preventDefault();
    }
});

console.log('✅ Mini IDE frontend ready!');
