// /api/log.js (已修正版本)

import fs from 'fs/promises';
import path from 'path';

export default async function handler(request, response) {
  // 1. 安全性检查：只接受POST请求
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed. Please use POST.' });
  }

  // 2. 数据接收
  const incomingData = request.body;

  if (!incomingData || incomingData.length === 0) {
    return response.status(400).json({ message: 'No data received.' });
  }

  try {
    // 3. 准备存储路径和文件名
    const storagePath = path.join('/tmp', 'gamelogs');
    await fs.mkdir(storagePath, { recursive: true });

    const participantId = incomingData[0]?.participantId || 'unknown_participant';
    const sessionId = incomingData[0]?.sessionId || 'unknown_session';
    const timestamp = Date.now();
    const fileName = `${participantId}_${sessionId}_${timestamp}.json`;
    const filePath = path.join(storagePath, fileName);

    // --- 【【【核心修正点在这里】】】 ---
    // 4. 先把数据转换成格式化的字符串，并保存在一个变量里
    const jsonDataString = JSON.stringify(incomingData, null, 2);

    // 5. 将这个字符串写入文件
    await fs.writeFile(filePath, jsonDataString);

    // 6. 成功后，再用同一个字符串打印到日志里
    console.log("--- START OF GAME DATA ---");
    console.log(jsonDataString); // 现在 jsonDataString 是已定义的
    console.log("--- END OF GAME DATA ---");

    // 7. 成功响应
    console.log(`Successfully saved log to: ${filePath}`);
    return response.status(200).json({ message: 'Log received successfully.' });

  } catch (error) {
    // 8. 错误处理
    console.error('Error writing log file:', error);
    return response.status(500).json({ message: 'Internal Server Error.' });
  }
}
