/**
 * DataLogger.js - "心智航图"项目数据采集模块 v3.0 (协议完全对齐版)
 *
 * 严格遵循 "心智航图"行为数据采集协议 v1.0 (CA-BDAP v1.0)。
 * 新增：记录 experiment_session_end 事件。
 */
class DataLogger {
    constructor() {
        this.participantId = this.getOrCreateId('ca-participantId');
        this.sessionId = this.generateUniqueId();
        this.eventSequenceId = 0;
        this.protocolVersion = '1.0';

        this.logBuffer = [];
        this.backendUrl = 'https://psygame.vercel.app/api/log'; // <--- 【【【请务必替换成你的真实后端地址】】】

        this.batchSendInterval = setInterval(() => this.sendData(), 5000);

        // [协议对齐] 监听页面卸载事件，记录 session_end 并进行最后的数据投递
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // 只有当这不是由正常游戏完成触发时才记录'user_closed'
                const isCompleted = this.logBuffer.some(e => e.eventType === 'experiment_session_end' && e.eventPayload.reason === 'completed');
                if (!isCompleted) {
                    this.logEvent('experiment_session_end', { reason: 'user_closed' });
                }
                this.sendData(true);
            }
        });
    }

    logEvent(eventType, eventPayload) {
        if (!eventType) {
            console.error("DataLogger Error: eventType cannot be null or empty.");
            return;
        }

        const event = {
            participantId: this.participantId,
            sessionId: this.sessionId,
            protocolVersion: this.protocolVersion,
            eventSequenceId: this.eventSequenceId++,
            clientTimestamp: Date.now(),
            eventType: eventType,
            eventPayload: eventPayload || {},
        };

        this.logBuffer.push(event);
        console.log(`[Event Logged] #${event.eventSequenceId} - ${event.eventType}`, event);

        if (this.logBuffer.length >= 20) {
            this.sendData();
        }
    }

    sendData(isFinal = false) {
        if (this.logBuffer.length === 0) {
            return;
        }

        const dataToSend = JSON.stringify(this.logBuffer);
        const dataLength = this.logBuffer.length;
        this.logBuffer = [];

        if (isFinal && navigator.sendBeacon) {
            try {
                const success = navigator.sendBeacon(this.backendUrl, dataToSend);
                if (success) {
                    console.log(`[Data Sent] Successfully queued ${dataLength} final events via sendBeacon.`);
                } else {
                    console.error('[Data Send Error] sendBeacon queueing failed.');
                }
            } catch (e) {
                console.error('[Data Send Error] Error while calling sendBeacon:', e);
            }
        } else {
            fetch(this.backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: dataToSend,
                keepalive: true,
            })
            .then(response => {
                if (response.ok) {
                    console.log(`[Data Sent] Successfully sent ${dataLength} batched events via fetch.`);
                } else {
                    console.error(`[Data Send Error] Server responded with status ${response.status}.`);
                }
            })
            .catch(error => {
                console.error('[Data Send Error] Network error while sending data via fetch:', error);
            });
        }
    }
    
    // [协议对齐] 此方法名修改，以明确其目的仅用于前端模块间通信
    getRawBufferDataForFrontend() {
        console.warn("getRawBufferDataForFrontend() is intended for local debugging. The primary data flow is through sendData() to a backend.");
        return [...this.logBuffer];
    }

    getOrCreateId(key) {
        let id = localStorage.getItem(key);
        if (!id) {
            id = this.generateUniqueId();
            try {
                localStorage.setItem(key, id);
            } catch (e) {
                console.error("Could not write to localStorage.", e);
            }
        }
        return id;
    }

    generateUniqueId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 15);
        return `${timestamp}-${randomPart}`;
    }

    flush() {
        clearInterval(this.batchSendInterval);
        this.sendData(true);
    }
}
