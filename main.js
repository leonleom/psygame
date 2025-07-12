/**
 * main.js - 模块化应用入口 (后台自动提交版) v37.0
 * 1. 适配 DataLogger 的最终汇总打包提交流程。
 * 2. 移除所有手动的发送触发器，完全依赖页面关闭时的自动发送。
 */

// --- 动态导入所有模块 ---
import { DataLogger } from './modules/DataLogger.js';
import { Game } from './modules/Game.js';
import { Tests } from './modules/Tests.js';
import { Results } from './modules/Results.js';
import { bis11 } from './modules/questionnaires/bis11.js';
import { csi } from './modules/questionnaires/csi.js';


console.log("main.js module is starting to execute.");

// 当整个页面的HTML都加载完成后，开始执行主逻辑
document.addEventListener('DOMContentLoaded', () => {

    console.log("DOM is fully loaded. Initializing modules and listeners.");

    // 实例化数据记录器，它现在主要负责本地存储和后台自动提交
    const dataLogger = new DataLogger();

    try {
        // DataLogger 的构造函数会自动处理会话开始事件的记录
        
        // 实例化所有核心模块
        const game = new Game('mazeCanvas', dataLogger);
        const tests = new Tests('tests-container', dataLogger);
        const results = new Results();
        
        // 将导入的问卷数据对象传递给 Tests 引擎进行初始化
        tests.init({
            bis11: bis11,
            csi: csi
        });

        // 获取所有必要的DOM元素
        const alertOverlay = document.getElementById('custom-alert-overlay');
        const alertMessage = document.getElementById('custom-alert-message');
        const alertOkBtn = document.getElementById('custom-alert-ok-btn');
        const startGameBtn = document.getElementById('startGameBtn');
        
        if (!alertOverlay || !alertMessage || !alertOkBtn || !startGameBtn) {
            console.error("一个或多个关键HTML元素未找到! 请检查ID。");
            return;
        }

        let onAlertOkCallback = null;

        // 定义自定义提示框函数
        function showCustomAlert(message, callback) {
            alertMessage.textContent = message;
            onAlertOkCallback = callback;
            alertOverlay.classList.remove('hidden');
        }

        // 为自定义提示框的“确定”按钮添加监听器
        alertOkBtn.addEventListener('click', () => {
            alertOverlay.classList.add('hidden');
            if (typeof onAlertOkCallback === 'function') {
                onAlertOkCallback();
                onAlertOkCallback = null;
            }
        });

        // 将 navigateTo 函数挂载到 window 对象上，使其成为全局函数
        window.navigateTo = function(viewId) {
            if (!viewId) return;

            if (document.getElementById('view-game').classList.contains('active')) {
                game.stopAndReset();
            }

            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            
            const targetView = document.getElementById(viewId);
            if (targetView) {
                targetView.classList.add('active');
            }

            if (viewId === 'view-results') {
                results.render(dataLogger.getRawBufferDataForFrontend());
            } else if (viewId === 'view-game') {
                game.resetUI();
            } else if (viewId === 'view-tests') {
                tests.reset();
            }
        }
        
        // 为所有导航元素（卡片和返回按钮）设置统一的事件监听器
        document.querySelectorAll('.card, .back-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.target;
                if(targetId) {
                    window.navigateTo(targetId);
                }
            });
        });

        // 为“开始游戏”按钮设置事件监听器
        startGameBtn.addEventListener('click', () => {
            game.start(() => {
                // 【核心修改】游戏完成后，提示语更加简洁
                showCustomAlert(
                    "恭喜，您已完成所有挑战！您的游戏数据已保存在本地。您可以继续完成其他项目，数据将在您离开页面时自动提交。",
                    () => { window.navigateTo('view-home'); }
                );
            });
        });
        
        console.log("Application setup complete. Ready for interaction.");

    } catch (error)
        {
        console.error("在初始化应用程序时发生了一个严重错误:", error);
        // 初始化失败时，DataLogger 的 visibilitychange 监听器会尽力发送已有数据
        alert("应用程序加载失败，请按F12打开浏览器控制台查看详细错误信息。");
    }
});