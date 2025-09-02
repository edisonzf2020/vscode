/**
 * Mini VSCode - 前端JavaScript
 * 处理文件资源管理器和编辑器的交互
 */

const { ipcRenderer } = require('electron');
const path = require('path');

// 辅助函数：安全的路径连接
function joinPath(dir, file) {
    if (dir.endsWith('/') || dir.endsWith('\\')) {
        return dir + file;
    }
    return dir + '/' + file;
}

// 辅助函数：获取目录名
function getDirName(filePath) {
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    return lastSlash > 0 ? filePath.substring(0, lastSlash) : filePath;
}

// 辅助函数：获取文件名
function getBaseName(filePath) {
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
}

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

// 自定义对话框功能
let modalResolve = null;

/**
 * 显示自定义输入对话框
 */
function showModal(title, placeholder = '', defaultValue = '') {
    return new Promise((resolve) => {
        modalResolve = resolve;

        const modalOverlay = document.getElementById('modalOverlay');
        const modalTitle = document.getElementById('modalTitle');
        const modalInput = document.getElementById('modalInput');

        modalTitle.textContent = title;
        modalInput.placeholder = placeholder;
        modalInput.value = defaultValue;

        modalOverlay.style.display = 'flex';
        modalInput.focus();
        modalInput.select();
    });
}

/**
 * 隐藏模态对话框
 */
function hideModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    modalOverlay.style.display = 'none';

    // 只有在取消时才resolve null，确认时不在这里resolve
    if (modalResolve) {
        modalResolve(null);
        modalResolve = null;
    }
}

/**
 * 确认模态对话框
 */
function confirmModal() {
    const modalInput = document.getElementById('modalInput');
    const value = modalInput.value.trim();

    console.log('📄 Modal confirmed with value:', value);

    // 先resolve值，再隐藏模态框
    if (modalResolve) {
        modalResolve(value);
        modalResolve = null;
    }

    // 手动隐藏模态框，不调用hideModal()以避免冲突
    const modalOverlay = document.getElementById('modalOverlay');
    modalOverlay.style.display = 'none';
}

// 模态对话框键盘事件
document.addEventListener('keydown', (e) => {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay.style.display === 'flex') {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmModal();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hideModal();
        }
    }
});

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
async function testFunction() {
    console.log('🧪 Test function called');
    updateStatus('Creating test workspace...');

    try {
        // 创建真实的测试工作区
        console.log('🧪 Attempting to create test workspace...');
        const testWorkspacePath = await createTestWorkspace();

        if (testWorkspacePath) {
            console.log('🧪 Loading real test workspace:', testWorkspacePath);
            updateStatus('Loading test workspace...');
            await loadWorkspace(testWorkspacePath);
            updateStatus('Real test workspace loaded');
            console.log('✅ Real test workspace loaded successfully');
        } else {
            throw new Error('Failed to create test workspace');
        }
    } catch (error) {
        // 回退到虚拟测试数据
        console.log('⚠️ Failed to create real workspace, using virtual test data:', error.message);
        updateStatus('Using virtual test data...');

        const testItems = [
            { name: 'test.txt', isDirectory: false, path: '/test/test.txt' },
            { name: 'folder1', isDirectory: true, path: '/test/folder1' },
            { name: 'script.js', isDirectory: false, path: '/test/script.js' }
        ];

        currentWorkspace = '/test';
        fileTree.set('/test', testItems);

        fileTree.set('/test/folder1', [
            { name: 'nested.txt', isDirectory: false, path: '/test/folder1/nested.txt' },
            { name: 'subfolder', isDirectory: true, path: '/test/folder1/subfolder' }
        ]);

        renderFileExplorer(testItems, '/test');
        updateStatus('Virtual test data loaded');
    }

    console.log('🧪 Test completed - current workspace:', currentWorkspace);
}

/**
 * 创建真实的测试工作区
 */
async function createTestWorkspace() {
    try {
        console.log('🧪 Requesting test workspace creation from main process...');

        // 请求主进程创建测试工作区
        const result = await ipcRenderer.invoke('create-test-workspace');

        console.log('🧪 Test workspace creation result:', result);

        if (result && result.success) {
            console.log('✅ Created test workspace at:', result.path);
            return result.path;
        } else {
            console.error('❌ Failed to create test workspace:', result ? result.error : 'No result returned');
            return null;
        }
    } catch (error) {
        console.error('❌ Error creating test workspace:', error);
        console.error('❌ Error stack:', error.stack);
        return null;
    }
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
            updateStatus(`Opened: ${getBaseName(folderPath)}`);
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
        console.log('📁 Loading workspace:', folderPath);
        const result = await ipcRenderer.invoke('read-directory', folderPath);

        if (result.success) {
            // 设置当前工作区 - 这是关键的修复！
            currentWorkspace = folderPath;
            // 确保全局可访问
            window.currentWorkspace = currentWorkspace;
            console.log('✅ Set currentWorkspace to:', currentWorkspace);

            // 存储根目录内容到文件树
            fileTree.set(folderPath, result.items);
            // 默认展开根目录
            expandedDirectories.add(folderPath);
            renderFileExplorer(result.items, folderPath);

            console.log('✅ Workspace loaded successfully:', folderPath);
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
function renderFileExplorer(items, basePath, level = 0, parentElement = null) {
    console.log('🎨 Rendering file explorer with', items.length, 'items at level', level);

    const container = parentElement || fileExplorer;

    if (level === 0) {
        fileExplorer.innerHTML = '';

        // 添加工作区根目录
        const rootItem = document.createElement('div');
        rootItem.className = 'file-item directory expanded';
        rootItem.style.fontWeight = 'bold';
        rootItem.style.marginBottom = '5px';
        rootItem.style.paddingLeft = '25px'; // 为展开图标留出空间
        rootItem.textContent = getBaseName(basePath);
        rootItem.dataset.path = basePath;
        rootItem.dataset.isDirectory = 'true';

        // 添加展开图标
        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.style.left = '5px';
        expandIcon.style.position = 'absolute';
        expandIcon.style.cursor = 'pointer';
        expandIcon.style.userSelect = 'none';
        expandIcon.style.width = '16px';
        expandIcon.style.height = '16px';
        expandIcon.style.display = 'flex';
        expandIcon.style.alignItems = 'center';
        expandIcon.style.justifyContent = 'center';
        expandIcon.style.fontSize = '12px';
        expandIcon.style.color = '#cccccc';
        expandIcon.style.top = '50%';
        expandIcon.style.transform = 'translateY(-50%)';

        // 根目录默认展开，所以显示向下箭头
        expandIcon.textContent = '▼';
        expandIcon.title = `Click to collapse ${getBaseName(basePath)}`;

        expandIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('🔄 Root expand icon clicked for:', basePath);
            toggleRootDirectory(basePath);
        });

        rootItem.appendChild(expandIcon);

        // 添加点击事件
        rootItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('expand-icon')) {
                console.log('📁 Root directory clicked:', basePath);
                toggleRootDirectory(basePath);
            }
        });

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

            // 设置目录的padding，为展开图标留出空间
            fileItem.style.paddingLeft = `${paddingLeft + 20}px`;

            // 添加展开图标
            const expandIcon = document.createElement('span');
            expandIcon.className = 'expand-icon';
            expandIcon.style.left = `${paddingLeft}px`;
            expandIcon.style.position = 'absolute';
            expandIcon.style.cursor = 'pointer';
            expandIcon.style.userSelect = 'none';
            expandIcon.style.width = '16px';
            expandIcon.style.height = '16px';
            expandIcon.style.display = 'flex';
            expandIcon.style.alignItems = 'center';
            expandIcon.style.justifyContent = 'center';
            expandIcon.style.fontSize = '12px';
            expandIcon.style.color = '#cccccc';
            expandIcon.style.top = '50%';
            expandIcon.style.transform = 'translateY(-50%)';

            // 直接设置图标内容，不依赖CSS
            expandIcon.textContent = isExpanded ? '▼' : '▶';
            expandIcon.title = `Click to ${isExpanded ? 'collapse' : 'expand'} ${item.name}`;

            expandIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🔄 Expand icon clicked for:', item.name, 'at path:', item.path);
                toggleDirectory(item.path);
            });

            console.log('📁 Created expand icon for:', item.name, 'expanded:', isExpanded, 'icon:', expandIcon.textContent);

            // 先添加展开图标
            fileItem.appendChild(expandIcon);

            fileItem.addEventListener('click', (e) => {
                // 如果点击的不是展开图标，也触发展开/折叠
                if (!e.target.classList.contains('expand-icon')) {
                    console.log('📁 Directory clicked:', item.name, 'at path:', item.path);
                    toggleDirectory(item.path);
                } else {
                    console.log('📁 Expand icon was clicked, handled by icon event');
                }
            });
        } else {
            const fileType = getFileTypeClass(item.name);
            fileItem.className = `file-item file ${fileType}`;
            fileItem.style.paddingLeft = `${paddingLeft}px`;

            fileItem.addEventListener('click', () => {
                console.log('📄 File clicked:', item.name);
                openFile(item.path);
            });
        }

        fileItem.textContent = item.name;
        fileItem.dataset.path = item.path;
        fileItem.dataset.isDirectory = item.isDirectory;

        // 添加右键菜单支持
        fileItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, item.path, item.isDirectory);
        });

        container.appendChild(fileItem);

        // 如果是展开的目录，递归渲染子项
        if (item.isDirectory && expandedDirectories.has(item.path)) {
            const children = fileTree.get(item.path);
            if (children) {
                renderFileExplorer(children, item.path, level + 1, container);
            }
        }
    });

    if (level === 0) {
        console.log('✅ File explorer rendered successfully');
    }
}

/**
 * 切换根目录展开/折叠状态
 */
async function toggleRootDirectory(rootPath) {
    console.log('📁 Toggling root directory:', rootPath);

    const rootItem = document.querySelector('.file-item.directory[data-path="' + rootPath + '"]');
    const expandIcon = rootItem ? rootItem.querySelector('.expand-icon') : null;

    if (rootItem && rootItem.classList.contains('expanded')) {
        // 折叠根目录
        rootItem.classList.remove('expanded');
        if (expandIcon) {
            expandIcon.textContent = '▶';
            expandIcon.title = `Click to expand ${getBaseName(rootPath)}`;
        }

        // 隐藏所有子项
        const allItems = document.querySelectorAll('.file-item');
        allItems.forEach(item => {
            if (item !== rootItem) {
                item.style.display = 'none';
            }
        });

        console.log('📁 Collapsed root directory:', rootPath);
        updateStatus(`Collapsed: ${getBaseName(rootPath)}`);
    } else {
        // 展开根目录
        if (rootItem) {
            rootItem.classList.add('expanded');
            if (expandIcon) {
                expandIcon.textContent = '▼';
                expandIcon.title = `Click to collapse ${getBaseName(rootPath)}`;
            }
        }

        // 显示所有子项
        const allItems = document.querySelectorAll('.file-item');
        allItems.forEach(item => {
            item.style.display = 'block';
        });

        console.log('📁 Expanded root directory:', rootPath);
        updateStatus(`Expanded: ${getBaseName(rootPath)}`);
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
                console.log('📁 Loading directory contents for:', dirPath);
                const result = await ipcRenderer.invoke('read-directory', dirPath);
                if (result.success) {
                    console.log('📁 Loaded', result.items.length, 'items from:', dirPath);
                    fileTree.set(dirPath, result.items);
                } else {
                    console.error('❌ Error loading directory:', result.error);
                    expandedDirectories.delete(dirPath); // 加载失败时取消展开
                    updateStatus('Error loading directory');
                    return;
                }
            } catch (error) {
                console.error('❌ Error loading directory:', error);
                expandedDirectories.delete(dirPath);
                updateStatus('Error loading directory');
                return;
            }
        }

        console.log('📁 Expanded directory:', dirPath);
    }

    // 重新渲染文件资源管理器
    if (currentWorkspace) {
        const rootItems = fileTree.get(currentWorkspace);
        if (rootItems) {
            console.log('🔄 Re-rendering file explorer after toggle');
            renderFileExplorer(rootItems, currentWorkspace);
            updateStatus(`${expandedDirectories.has(dirPath) ? 'Expanded' : 'Collapsed'}: ${getBaseName(dirPath)}`);
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

            updateStatus(`Opened: ${getBaseName(filePath)}`);
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

    const fileName = getBaseName(filePath);
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

    updateStatus(`Editing: ${getBaseName(filePath)}`);
}

/**
 * 关闭文件
 */
function closeFile(filePath) {
    const fileData = openFiles.get(filePath);

    // 如果文件已修改，询问是否保存
    if (fileData && fileData.modified) {
        const result = confirm(`Save changes to ${getBaseName(filePath)}?`);
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
            updateStatus(`Saved: ${getBaseName(filePath)}`);
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
        const fileName = getBaseName(filePath);

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
    console.log('🖱️ Showing context menu for:', targetPath, 'isDirectory:', isDirectory);

    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;

    // 存储当前右键点击的路径
    contextMenu.dataset.targetPath = targetPath;
    contextMenu.dataset.isDirectory = isDirectory;

    // 根据是否为根目录显示/隐藏重命名和删除选项
    const renameMenuItem = document.getElementById('renameMenuItem');
    const deleteMenuItem = document.getElementById('deleteMenuItem');
    const isRootDirectory = targetPath === currentWorkspace;

    console.log('🖱️ Is root directory:', isRootDirectory);

    if (isRootDirectory) {
        renameMenuItem.style.display = 'none';
        deleteMenuItem.style.display = 'none';
    } else {
        renameMenuItem.style.display = 'block';
        deleteMenuItem.style.display = 'block';
    }
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
    console.log('📄 Creating new file...');

    try {
        const contextMenu = document.getElementById('contextMenu');
        const targetPath = contextMenu.dataset.targetPath;
        const isDirectory = contextMenu.dataset.isDirectory === 'true';

        console.log('📄 Target path:', targetPath, 'isDirectory:', isDirectory);

        hideContextMenu();

        // 使用自定义对话框
        const fileName = await showModal('New File', 'Enter file name...', 'new-file.txt');
        console.log('📄 User entered file name:', fileName);

        if (!fileName || fileName.trim() === '') {
            console.log('📄 File creation cancelled - no name provided');
            updateStatus('File creation cancelled');
            return;
        }

        const cleanFileName = fileName.trim();
        console.log('📄 Creating file with clean name:', cleanFileName);

        // 改进路径处理
        let filePath;
        console.log('📄 Current workspace:', currentWorkspace);

        if (isDirectory) {
            // 如果右键点击的是目录，在该目录下创建文件
            filePath = targetPath.endsWith('/') ? targetPath + cleanFileName : targetPath + '/' + cleanFileName;
            console.log('📄 Creating file in directory:', targetPath);
        } else {
            // 如果右键点击的是文件，在该文件的父目录下创建文件
            const lastSlash = Math.max(targetPath.lastIndexOf('/'), targetPath.lastIndexOf('\\'));
            const parentDir = lastSlash > 0 ? targetPath.substring(0, lastSlash) : currentWorkspace || targetPath;
            filePath = parentDir.endsWith('/') || parentDir.endsWith('\\') ? parentDir + cleanFileName : parentDir + '/' + cleanFileName;
            console.log('📄 Creating file in parent directory of:', targetPath, 'which is:', parentDir);
        }

        console.log('📄 Final file path:', filePath);

        // 创建空文件
        updateStatus('Creating file...');
        console.log('📄 Invoking write-file IPC with path:', filePath);

        try {
            const result = await ipcRenderer.invoke('write-file', filePath, '// New file created by Mini VSCode\n');
            console.log('📄 Write file result:', JSON.stringify(result, null, 2));

            if (result && result.success) {
                console.log('✅ Successfully created new file:', filePath);
                updateStatus(`Created: ${cleanFileName}`);

                // 刷新文件资源管理器
                console.log('🔄 Refreshing explorer after file creation...');
                await refreshExplorer();
                console.log('✅ Explorer refresh completed');
            } else {
                const errorMsg = result ? result.error : 'No result returned from write-file';
                console.error('❌ Error creating file:', errorMsg);
                updateStatus('Error creating file: ' + errorMsg);
                alert('Error creating file: ' + errorMsg);
            }
        } catch (error) {
            console.error('❌ Exception during file creation:', error);
            console.error('❌ Error stack:', error.stack);
            updateStatus('Exception creating file: ' + error.message);
            alert('Exception creating file: ' + error.message);
        }
    } catch (error) {
        console.error('❌ Exception in createNewFile:', error);
        updateStatus('Error: ' + error.message);
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

    const folderName = await showModal('New Folder', 'Enter folder name...', 'new-folder');
    if (!folderName || folderName.trim() === '') {
        console.log('📁 Folder creation cancelled');
        return;
    }

    try {
        // 确定文件夹路径
        const folderPath = isDirectory ?
            joinPath(targetPath, folderName) :
            joinPath(getDirName(targetPath), folderName);

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
 * 重命名文件或文件夹
 */
async function renameItem() {
    const contextMenu = document.getElementById('contextMenu');
    const targetPath = contextMenu.dataset.targetPath;
    const isDirectory = contextMenu.dataset.isDirectory === 'true';

    hideContextMenu();

    const currentName = getBaseName(targetPath);
    const newName = prompt(`Rename ${isDirectory ? 'folder' : 'file'}:`, currentName);

    if (!newName || newName === currentName) return;

    try {
        const parentDir = getDirName(targetPath);
        const newPath = joinPath(parentDir, newName);

        const result = await ipcRenderer.invoke('rename-item', targetPath, newPath);

        if (result.success) {
            console.log('✅ Renamed item:', targetPath, '->', newPath);
            updateStatus(`Renamed: ${currentName} → ${newName}`);

            // 如果重命名的文件当前正在编辑，更新标签页
            if (!isDirectory && openFiles.has(targetPath)) {
                const fileData = openFiles.get(targetPath);
                openFiles.delete(targetPath);
                openFiles.set(newPath, fileData);

                // 更新标签页
                const tab = document.querySelector(`[data-file-path="${targetPath}"]`);
                if (tab) {
                    tab.dataset.filePath = newPath;
                    const tabName = tab.querySelector('.tab-name');
                    if (tabName) {
                        tabName.textContent = newName;
                    }
                }

                // 如果是当前活动文件，更新activeFile
                if (activeFile === targetPath) {
                    activeFile = newPath;
                }
            }

            // 刷新文件资源管理器
            await refreshExplorer();
        } else {
            console.error('❌ Error renaming item:', result.error);
            updateStatus('Error renaming item');
            alert('Error renaming item: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error renaming item:', error);
        updateStatus('Error renaming item');
        alert('Error renaming item: ' + error.message);
    }
}

/**
 * 删除文件或文件夹
 */
async function deleteItem() {
    const contextMenu = document.getElementById('contextMenu');
    const targetPath = contextMenu.dataset.targetPath;
    const isDirectory = contextMenu.dataset.isDirectory === 'true';

    hideContextMenu();

    const itemName = getBaseName(targetPath);
    const confirmMessage = `Are you sure you want to delete ${isDirectory ? 'folder' : 'file'} "${itemName}"?`;

    if (!confirm(confirmMessage)) return;

    try {
        const result = await ipcRenderer.invoke('delete-item', targetPath, isDirectory);

        if (result.success) {
            console.log('✅ Deleted item:', targetPath);
            updateStatus(`Deleted: ${itemName}`);

            // 如果删除的文件当前正在编辑，关闭标签页
            if (!isDirectory && openFiles.has(targetPath)) {
                closeFile(targetPath);
            }

            // 刷新文件资源管理器
            await refreshExplorer();
        } else {
            console.error('❌ Error deleting item:', result.error);
            updateStatus('Error deleting item');
            alert('Error deleting item: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error deleting item:', error);
        updateStatus('Error deleting item');
        alert('Error deleting item: ' + error.message);
    }
}

/**
 * 刷新文件资源管理器
 */
async function refreshExplorer() {
    if (currentWorkspace) {
        console.log('🔄 Refreshing file explorer, current workspace:', currentWorkspace);

        // 保存当前展开状态
        const savedExpandedDirectories = new Set(expandedDirectories);

        // 清除缓存的文件树，但保持展开状态
        fileTree.clear();

        // 重新加载工作区
        await loadWorkspace(currentWorkspace);

        // 恢复展开状态
        expandedDirectories = savedExpandedDirectories;

        // 重新渲染以显示展开状态
        const rootItems = fileTree.get(currentWorkspace);
        if (rootItems) {
            renderFileExplorer(rootItems, currentWorkspace);
        }

        updateStatus('Explorer refreshed');
        console.log('✅ Explorer refresh completed');
    } else {
        console.log('⚠️ No current workspace to refresh');
        updateStatus('No workspace to refresh');
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

// 全局错误处理
window.addEventListener('error', (e) => {
    console.error('❌ JavaScript Error:', e.error);
    updateStatus('JavaScript Error: ' + e.message);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled Promise Rejection:', e.reason);
    updateStatus('Promise Error: ' + e.reason);
});

// 调试面板功能
let debugLogs = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

function addDebugLog(message, type = 'log') {
    const timestamp = new Date().toLocaleTimeString();
    debugLogs.push({ timestamp, message, type });
    if (debugLogs.length > 50) {
        debugLogs.shift(); // 保持最新50条日志
    }
    updateDebugPanel();
}

// 重写console.log和console.error来捕获日志
console.log = function (...args) {
    originalConsoleLog.apply(console, args);
    addDebugLog(args.join(' '), 'log');
};

console.error = function (...args) {
    originalConsoleError.apply(console, args);
    addDebugLog(args.join(' '), 'error');
};

function toggleDebugPanel() {
    const panel = document.getElementById('debugPanel');
    const toggle = document.getElementById('debugToggle');

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        toggle.style.display = 'none';
        updateDebugPanel();
    } else {
        panel.style.display = 'none';
        toggle.style.display = 'block';
    }
}

function updateDebugPanel() {
    const content = document.getElementById('debugContent');
    if (!content) return;

    const statusInfo = `
        <div style="margin-bottom: 10px; padding: 5px; background: #2d2d30; border-radius: 3px;">
            <strong>Status:</strong><br>
            Workspace: ${currentWorkspace || 'None'}<br>
            Expanded Dirs: ${expandedDirectories.size}<br>
            File Tree Size: ${fileTree.size}
        </div>
    `;

    const logsHtml = debugLogs.slice(-10).map(log =>
        `<div style="color: ${log.type === 'error' ? '#ff6b6b' : '#cccccc'}; margin: 2px 0;">
            [${log.timestamp}] ${log.message}
        </div>`
    ).join('');

    content.innerHTML = statusInfo + logsHtml;
    content.scrollTop = content.scrollHeight;
}

console.log('✅ Mini IDE frontend ready!');
