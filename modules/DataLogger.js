// modules/DataLogger.js (最终健壮版 - 增量发送) v10.0

export class DataLogger {
    constructor() {
        this.participantId = this.getOrCreateId('ca-participantId');
        this.sessionId = this.getSessionId();
        this.protocolVersion = '1.0';
        
        this.backendUrl = 'https://psygame.vercel.app/api/log';

        // 追踪已发送的事件数量索引
        this.lastSentEventIndex = this.loadLastSentIndex();

        // 每隔15秒，定时检查并发送增量数据
        this.batchSendInterval = setInterval(() => this.sendIncrementalData(), 15000);

        // 在页面关闭时，尽力发送最后一批数据
        window.addEventListener('pagehide', () => {
            this.sendIncrementalData(true); // true 表示这是最后一次发送
        }, { capture: true });
    }

    /**
     * 记录一个事件，只负责写入 localStorage。
     * @param {string} eventType - 事件类型
     * @param {object} eventPayload - 事件负载
     */
    logEvent(eventType, eventPayload) {
        if (!eventType) {
            console.error("DataLogger Error: eventType cannot be null or empty.");
            return;
        }

        let logBuffer = this.loadLogsForSession();
        const eventSequenceId = logBuffer.length;

        const event = {
            participantId: this.participantId,
            sessionId: this.sessionId,
            protocolVersion: this.protocolVersion,
            eventSequenceId: eventSequenceId,
            clientTimestamp: Date.now(),
            eventType: eventType,
            eventPayload: eventPayload || {},
        };

        logBuffer.push(event);
        this.saveLogsForSession(logBuffer);
        console.log(`[Event Persisted] ID: #${eventSequenceId} - ${event.eventType}`);
    }

    /**
     * 发送自上次发送以来的所有新数据 (增量发送)
     * @param {boolean} isFinal - 标记这是否是会话的最后一次发送
     */
    sendIncrementalData(isFinal = false) {
        const allLogs = this.loadLogsForSession();
        
        // 找出所有未发送的事件
        const unsentLogs = allLogs.slice(this.lastSentEventIndex);

        if (unsentLogs.length === 0) {
            if (isFinal) { // 如果是最后一次，但没有新数据，也要确保清理
                this.clearAllDataForSession();
            }
            console.log("No new data to send.");
            return;
        }

        console.log(`Preparing to send ${unsentLogs.length} new events...`);

        // 构建要发送的负载
        const payload = {
            sessionId: this.sessionId,
            participantId: this.participantId,
            isFinalChunk: isFinal, // 告诉后端这是否是最后一个数据块
            events: unsentLogs
        };
        
        const dataString = JSON.stringify(payload);
        const dataBlob = new Blob([dataString], { type: 'application/json' });

        // 定义发送成功后的回调函数
        const onSuccess = () => {
            this.lastSentEventIndex = allLogs.length;
            this.saveLastSentIndex(this.lastSentEventIndex);
            console.log(`Successfully sent events up to index ${this.lastSentEventIndex - 1}.`);
            if (isFinal) {
                this.clearAllDataForSession();
            }
        };

        // 优先使用 sendBeacon 发送最后的数据
        if (isFinal && navigator.sendBeacon && dataBlob.size < 65536) {
            if (navigator.sendBeacon(this.backendUrl, dataBlob)) {
                onSuccess();
            } else {
                console.error("sendBeacon queueing failed. Data might be lost.");
            }
        } else {
            // 对于定时发送或备用方案，使用 fetch
            fetch(this.backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: dataString,
                keepalive: isFinal,
            })
            .then(res => {
                if(res.ok) {
                    onSuccess();
                } else {
                    console.error("Server responded with an error. Data will be resent later.");
                }
            })
            .catch(err => console.error("Fetch error. Data will be resent later.", err));
        }
    }
    
    // --- 辅助函数 ---

    loadLastSentIndex() {
        return parseInt(sessionStorage.getItem('ca-lastSentIndex') || '0', 10);
    }

    saveLastSentIndex(index) {
        sessionStorage.setItem('ca-lastSentIndex', String(index));
    }

    clearAllDataForSession() {
        console.log(`Clearing all data for session: ${this.sessionId}`);
        localStorage.removeItem('ca-gameLogs-' + this.sessionId);
        sessionStorage.removeItem('ca-lastSentIndex');
        localStorage.removeItem('bis11_results');
        localStorage.removeItem('csi_results');
        localStorage.removeItem('cfi_results');
        localStorage.removeItem('mai_results');
        localStorage.removeItem('demographics_results');
        localStorage.removeItem('rpm_results')
    }

    getOrCreateId(key) {
        let id = localStorage.getItem(key);
        if (!id) {
            id = this.generateUniqueId();
            localStorage.setItem(key, id);
        }
        return id;
    }

    getSessionId() {
        let sid = sessionStorage.getItem('ca-sessionId');
        if (!sid) {
            sid = this.generateUniqueId();
            sessionStorage.setItem('ca-sessionId', sid);
        }
        return sid;
    }

    loadLogsForSession() {
        if (!this.sessionId) return [];
        try {
            const storedLogs = localStorage.getItem('ca-gameLogs-' + this.sessionId);
            return storedLogs ? JSON.parse(storedLogs) : [];
        } catch (e) { 
            console.error("Failed to load logs from localStorage.", e);
            return []; 
        }
    }

    saveLogsForSession(logs) {
        if (!this.sessionId) return;
        localStorage.setItem('ca-gameLogs-' + this.sessionId, JSON.stringify(logs));
    }

    generateUniqueId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 15);
        return `${timestamp}-${randomPart}`;
    }
    
    getRawBufferDataForFrontend() {
        return this.loadLogsForSession();
    }
}
