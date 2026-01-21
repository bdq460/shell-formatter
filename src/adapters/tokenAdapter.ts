/**
 * 适配 VSCode CancellationToken 到基础层接口
 */

import * as vscode from 'vscode';
import { CancellationToken } from '../tools/executor';

/**
 * VSCode 取消令牌适配器
 */
export class VSCodeTokenAdapter implements CancellationToken {
    constructor(private vscodeToken: vscode.CancellationToken) { }

    get isCancellationRequested(): boolean {
        return this.vscodeToken.isCancellationRequested;
    }

    onCancellationRequested(callback: () => void): void {
        this.vscodeToken.onCancellationRequested(callback);
    }
}
