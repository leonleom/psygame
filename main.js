/**
 * main.js - 模块化应用入口 v38.0 (简化交互版)
 * - 移除了 navigateTo 中对 game 对象的复杂调用，让 Game 模块自己管理状态。
 * - 确保 startGameBtn 的 click 事件是开始新游戏的唯一入口。
 */

import { DataLogger } from './modules/DataLogger.js';
import { Game } from './modules/Game.js';
import { Tests } from './modules/Tests.js';
import { Results } from './modules/Results.js';
import { bis11 } from './modules/questionnaires/bis11.js';
import { csi } from './modules/questionnaires/csi.js';
import { cfi } from './modules/questionnaires/cfi.js';
import { mai } from './modules/questionnaires/mai.js';
import { demographics } from './modules/questionnaires/demographics.js';
import { rpm } from './modules/questionnaires/rpm.js';

document.addEventListener('DOMContentLoaded', () => {
    const dataLogger = new DataLogger();
    try {
        const game = new Game('mazeCanvas', dataLogger);
        const tests = new Tests('tests-container', dataLogger);
        const results = new Results();
        
        tests.init({ bis11, csi, cfi, mai, demographics, rpm });

        const alertOverlay = document.getElementById('custom-alert-overlay');
        const alertMessage = document.getElementById('custom-alert-message');
        const alertOkBtn = document.getElementById('custom-alert-ok-btn');
        const startGameBtn = document.getElementById('startGameBtn');

        function showCustomAlert(message, callback) {
            alertMessage.textContent = message;
            window.onAlertOkCallback = callback; // Use global scope to avoid closure issues
            alertOverlay.classList.remove('hidden');
        }

        alertOkBtn.addEventListener('click', () => {
            alertOverlay.classList.add('hidden');
            if (typeof window.onAlertOkCallback === 'function') {
                window.onAlertOkCallback();
                window.onAlertOkCallback = null;
            }
        });

        window.navigateTo = function(viewId) {
            // 如果当前是游戏视图而目标不是游戏视图，就重置游戏
            if (document.getElementById('view-game').classList.contains('active') && viewId !== 'view-game') {
                game.stopAndReset();
            }

            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            const targetView = document.getElementById(viewId);
            if (targetView) {
                targetView.classList.add('active');
            }

            if (viewId === 'view-results') {
                results.render(dataLogger.getRawBufferDataForFrontend());
            } else if (viewId === 'view-tests') {
                tests.reset();
            }
        }
        
        document.querySelectorAll('.card, .back-button').forEach(button => {
            button.addEventListener('click', (e) => {
                window.navigateTo(e.currentTarget.dataset.target);
            });
        });

        startGameBtn.addEventListener('click', () => {
            // 这是开始游戏的唯一入口，game.start() 内部会处理所有重置逻辑
            game.start(() => {
                showCustomAlert(
                    "恭喜，您已完成所有挑战！您的游戏数据已保存在本地。您可以继续完成其他项目，数据将在您离开页面时自动提交。",
                    () => { window.navigateTo('view-home'); }
                );
            });
        });
        
    } catch (error) {
        console.error("应用程序初始化时发生严重错误:", error);
        alert("应用程序加载失败，请检查浏览器控制台。");
    }
});