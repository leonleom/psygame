// /api/log.js (增量追加 + 打印日志版)

import fs from 'fs/promises';
import path from 'path';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed.' });
  }

  const payload = request.body;

  if (!payload || !payload.sessionId || !Array.isArray(payload.events)) {
    return response.status(400).json({ message: 'Invalid payload.' });
  }
  
  if (payload.events.length === 0) {
    return response.status(200).json({ message: 'Empty chunk received.' });
  }

  try {
    const storagePath = path.join('/tmp', 'session_logs');
    await fs.mkdir(storagePath, { recursive: true });

    const fileName = `${payload.sessionId}.jsonlog`; 
    const filePath = path.join(storagePath, fileName);

    const dataToAppend = payload.events.map(event => JSON.stringify(event)).join('\n') + '\n';

    await fs.appendFile(filePath, dataToAppend);

    // 【【【确保这部分代码存在！！！】】】
    // 在成功追加后，打印出本次追加的数据内容，方便调试
    console.log("--- START OF APPENDED CHUNK ---");
    console.log(JSON.stringify(payload.events, null, 2)); // 只打印事件数组，更清晰
    console.log("--- END OF APPENDED CHUNK ---");

    console.log(`Successfully appended ${payload.events.length} events to ${fileName}`);
    return response.status(200).json({ message: 'Chunk received successfully.' });

  } catch (error) {
    console.error('Error appending to log file:', error);
    return response.status(500).json({ message: 'Internal Server Error.' });
  }
}
