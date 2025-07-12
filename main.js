/**
 * main.js - 最终修正版 v32.0 (协议对齐)
 * 1. 增加了 experiment_session_start 事件的记录，完全遵循 CA-BDAP v1.0。
 * 2. 在应用初始化失败时，记录 experiment_session_end 事件。
 */
console.log("main.js script is starting to execute.");

document.addEventListener('DOMContentLoaded', () => {

    console.log("DOM is fully loaded. Initializing modules and listeners.");

    // [协议对齐] 在最开始就初始化DataLogger，以便尽早记录事件
    const dataLogger = new DataLogger();

    try {
        // [协议对齐] 记录会话开始事件
        dataLogger.logEvent('experiment_session_start', {
            clientInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screen: {
                    width: window.screen.width,
                    height: window.screen.height,
                    pixelRatio: window.devicePixelRatio
                },
                window: {
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight
                }
            }
        });

        const game = new Game('mazeCanvas', dataLogger);
        const tests = new Tests('tests-container', dataLogger);
        const results = new Results();

        const alertOverlay = document.getElementById('custom-alert-overlay');
        const alertMessage = document.getElementById('custom-alert-message');
        const alertOkBtn = document.getElementById('custom-alert-ok-btn');
        const startGameBtn = document.getElementById('startGameBtn');

        if (!alertOverlay || !alertMessage || !alertOkBtn || !startGameBtn) {
            console.error("一个或多个关键HTML元素未找到! 请检查ID。");
            return;
        }

        let onAlertOkCallback = null;

        function showCustomAlert(message, callback) {
            alertMessage.textContent = message;
            onAlertOkCallback = callback;
            alertOverlay.classList.remove('hidden');
        }

        alertOkBtn.addEventListener('click', () => {
            alertOverlay.classList.add('hidden');
            if (typeof onAlertOkCallback === 'function') {
                onAlertOkCallback();
                onAlertOkCallback = null;
            }
        });

        function navigateTo(viewId) {
            if (!viewId) return;

            if (document.getElementById('view-game').classList.contains('active')) {
                game.stopAndReset();
            }

            alertOverlay.classList.add('hidden');
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            const targetView = document.getElementById(viewId);
            if (targetView) {
                targetView.classList.add('active');
            }

            if (viewId === 'view-results') {
                // 确保在渲染结果前，所有缓冲数据都被发送或考虑
                dataLogger.sendData(); 
                results.render(dataLogger.getRawBufferDataForFrontend());
            } else if (viewId === 'view-game') {
                game.resetUI();
            }
        }

        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                navigateTo(card.dataset.target);
            });
        });

        document.querySelectorAll('.back-button').forEach(button => {
            button.addEventListener('click', () => {
                navigateTo(button.dataset.target);
            });
        });

        startGameBtn.addEventListener('click', () => {
            game.start(() => {
                // [协议对齐] 游戏正常完成后，记录会话结束事件
                dataLogger.logEvent('experiment_session_end', { reason: 'completed' });
                showCustomAlert(
                    "恭喜，您已完成所有挑战！您的游戏过程数据已生成。现在可以前往“结果分析”页面查看您的专属认知画像。",
                    () => { navigateTo('view-home'); }
                );
            });
        });

        console.log("Application setup complete. Ready for interaction.");

    } catch (error) {
        console.error("在初始化应用程序时发生了一个严重错误:", error);
        // [协议对齐] 应用初始化失败时，记录会话结束事件
        dataLogger.logEvent('experiment_session_end', { reason: 'error', details: error.message });
        alert("应用程序加载失败，请按F12打开浏览器控制台查看详细错误信息。");
    }
});