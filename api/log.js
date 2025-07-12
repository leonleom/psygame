// /api/log.js (汇总报告接收版)

import fs from 'fs/promises';
import path from 'path';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed. Please use POST.' });
  }

  // 接收到的是一个完整的报告对象
  const finalReport = request.body;

  if (!finalReport || !finalReport.sessionId) {
    return response.status(400).json({ message: 'Invalid report data received.' });
  }

  try {
    const storagePath = path.join('/tmp', 'final_reports');
    await fs.mkdir(storagePath, { recursive: true });

    // 使用 sessionId 和时间戳作为文件名
    const sessionId = finalReport.sessionId;
    const timestamp = finalReport.reportTimestamp || Date.now();
    const fileName = `${sessionId}_${timestamp}.json`;
    const filePath = path.join(storagePath, fileName);

    // 将整个报告对象格式化后写入文件
    await fs.writeFile(filePath, JSON.stringify(finalReport, null, 2));

    console.log(`Successfully saved final report to: ${filePath}`);
    return response.status(200).json({ message: 'Final report received successfully.' });

  } catch (error) {
    console.error('Error writing final report file:', error);
    return response.status(500).json({ message: 'Internal Server Error.' });
  }
}