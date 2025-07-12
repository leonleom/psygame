// /api/log.js (增量追加版)

import fs from 'fs/promises';
import path from 'path';

export default async function handler(request, response) {
  // 1. 只接受 POST 请求
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed. Please use POST.' });
  }

  // 2. 接收增量数据负载
  const payload = request.body;

  // 3. 严格检查负载格式
  if (!payload || !payload.sessionId || !Array.isArray(payload.events)) {
    console.error("Received invalid incremental payload:", JSON.stringify(payload));
    return response.status(400).json({ message: 'Invalid payload. Expecting {sessionId, events: []}.' });
  }
  
  // 如果事件数组为空，也可以直接返回成功，不做任何事
  if (payload.events.length === 0) {
    console.log("Received a payload with 0 events. No action taken.");
    return response.status(200).json({ message: 'Empty chunk received.' });
  }

  try {
    // 4. 准备存储路径和文件名
    const storagePath = path.join('/tmp', 'session_logs');
    await fs.mkdir(storagePath, { recursive: true });

    // 文件名只跟 sessionId 相关，使用 .jsonlog 扩展名表示 JSON Lines 格式
    const fileName = `${payload.sessionId}.jsonlog`; 
    const filePath = path.join(storagePath, fileName);

    // 5. 将每个事件对象转换为字符串，并用换行符连接
    // 这种格式 (JSON Lines) 非常适合流式处理和追加数据
    const dataToAppend = payload.events.map(event => JSON.stringify(event)).join('\n') + '\n';

    // 6. 【核心】使用 fs.appendFile 来追加内容，而不是覆盖整个文件
    await fs.appendFile(filePath, dataToAppend);

    // 7. 成功响应
    console.log(`Successfully appended ${payload.events.length} events to ${fileName}`);
    return response.status(200).json({ message: 'Chunk received successfully.' });

  } catch (error) {
    // 8. 错误处理
    console.error('Error appending to log file:', error);
    return response.status(500).json({ message: 'Internal Server Error.', error: error.message });
  }
}
