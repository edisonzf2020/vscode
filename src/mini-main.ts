/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Mini VSCode - 最简启动版本
 * 直接基于现有main.ts，但添加mini模式控制
 */

import * as path from 'node:path';
import * as fs from 'original-fs';
import * as os from 'node:os';
import { performance } from 'node:perf_hooks';
import { configurePortable } from './bootstrap-node.js';
import { bootstrapESM } from './bootstrap-esm.js';
import { app, protocol, crashReporter, Menu, contentTracing } from 'electron';
import minimist from 'minimist';
import { product } from './bootstrap-meta.js';
import { parse } from './vs/base/common/jsonc.js';
import { getUserDataPath } from './vs/platform/environment/node/userDataPath.js';
import * as perf from './vs/base/common/performance.js';
import { resolveNLSConfiguration } from './vs/base/node/nls.js';
import { getUNCHost, addUNCHostToAllowlist } from './vs/base/node/unc.js';
import { INLSConfiguration } from './vs/nls.js';
import { NativeParsedArgs } from './vs/platform/environment/common/argv.js';

// 🎯 Mini VSCode 配置
console.log('🚀 Starting Mini VSCode...');
process.env['MINI_VSCODE'] = 'true';
process.env['VSCODE_DEV'] = 'true'; // 启用开发模式以便调试

// 设置Mini模式的功能开关
const MINI_FEATURES = {
    // 核心功能
    editor: true,
    fileSystem: true,
    basicUI: true,

    // 暂时禁用的功能
    extensions: false,
    git: false,
    debug: false,
    terminal: false,
    search: false,
    marketplace: false,

    // UI组件
    activityBar: false,
    sideBar: false,
    panel: false,
    statusBar: true,
    menuBar: true,

    // 高级功能
    remoteSSH: false,
    liveShare: false,
    notebooks: false
};

console.log('📋 Mini features enabled:', Object.entries(MINI_FEATURES).filter(([k, v]) => v).map(([k]) => k).join(', '));
process.env['MINI_FEATURES'] = JSON.stringify(MINI_FEATURES);

perf.mark('code/didStartMain');

perf.mark('code/willLoadMainBundle', {
    startTime: Math.floor(performance.timeOrigin)
});
perf.mark('code/didLoadMainBundle');

// Enable portable support
const portable = configurePortable(product);

const args = parseCLIArgs();
const argvConfig = configureCommandlineSwitchesSync(args);

// 简化的沙箱配置
if (args['sandbox'] &&
    !args['disable-chromium-sandbox'] &&
    !argvConfig['disable-chromium-sandbox']) {
    app.enableSandbox();
} else {
    app.commandLine.appendSwitch('no-sandbox');
}

// 简化的协议注册
protocol.registerSchemesAsPrivileged([
    { scheme: 'vscode-file', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

// 简化的应用事件处理
app.once('ready', onReady);
app.once('will-quit', () => {
    console.log('Mini VSCode is quitting...');
});

async function onReady() {
    perf.mark('code/mainAppReady');

    try {
        const codeCachePath = getCodeCachePath();
        const [, nlsConfig] = await Promise.all([
            mkdirpIgnoreError(codeCachePath),
            resolveNlsConfiguration()
        ]);

        await startup(codeCachePath, nlsConfig);
    } catch (error) {
        console.error('Mini VSCode startup error:', error);
    }
}

/**
 * 简化的启动流程
 */
async function startup(codeCachePath: string | undefined, nlsConfig: INLSConfiguration): Promise<void> {
    process.env['VSCODE_NLS_CONFIG'] = JSON.stringify(nlsConfig);
    process.env['VSCODE_CODE_CACHE_PATH'] = codeCachePath || '';

    console.log('🚀 Starting Mini VSCode...');
    console.log('📁 Code cache path:', codeCachePath);
    console.log('🌐 NLS config:', nlsConfig.resolvedLanguage);

    // Bootstrap ESM
    await bootstrapESM();

    // Load Main - 使用原始的main.js，但环境变量会告诉它我们在Mini模式
    await import('./vs/code/electron-main/main.js');
    perf.mark('code/didRunMainBundle');
}

// 辅助函数（简化版本）
function parseCLIArgs(): NativeParsedArgs {
    const minimistOptions = {
        string: ['locale', 'user-data-dir', 'extensions-dir'],
        boolean: ['help', 'version', 'sandbox', 'disable-chromium-sandbox']
    };

    return minimist(process.argv.slice(2), minimistOptions) as NativeParsedArgs;
}

function configureCommandlineSwitchesSync(cliArgs: NativeParsedArgs): { [key: string]: any } {
    // 简化的命令行配置
    return {};
}

function getCodeCachePath(): string | undefined {
    // 简化的缓存路径
    return path.join(os.tmpdir(), 'mini-vscode-cache');
}

async function mkdirpIgnoreError(path: string | undefined): Promise<void> {
    if (path) {
        try {
            await fs.promises.mkdir(path, { recursive: true });
        } catch (error) {
            // 忽略错误
        }
    }
}

async function resolveNlsConfiguration(): Promise<INLSConfiguration> {
    // 简化的国际化配置
    return {
        locale: 'en',
        osLocale: 'en',
        resolvedLanguage: 'en',
        defaultMessagesFile: undefined,
        languagePack: undefined
    };
}
