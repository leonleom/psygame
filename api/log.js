// /api/log.js (汇总报告接收+健壮日志版)

import fs from 'fs/promises';
import path from 'path';

export default async function handler(request, response) {
  // 1. 只接受 POST 请求
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed. Please use POST.' });
  }

  // 2. 接收报告对象
  const finalReport = request.body;

  // 3. 严格检查接收到的数据是否有效
  if (!finalReport || typeof finalReport !== 'object' || !finalReport.sessionId) {
    // 在返回错误前，先把收到的东西打印出来，方便调试
    console.error("Received an invalid or empty report. Request body:", JSON.stringify(finalReport));
    return response.status(400).json({ message: 'Invalid or malformed report data received.' });
  }

  try {
    // 4. 准备存储路径和文件名
    const storagePath = path.join('/tmp', 'final_reports');
    await fs.mkdir(storagePath, { recursive: true });

    const sessionId = finalReport.sessionId;
    const timestamp = finalReport.reportTimestamp || Date.now();
    const fileName = `${sessionId}_${timestamp}.json`;
    const filePath = path.join(storagePath, fileName);

    // 5. 将整个报告对象格式化后写入文件
    await fs.writeFile(filePath, JSON.stringify(finalReport, null, 2));

    // 6. 成功响应
    console.log(`Successfully saved final report to: ${filePath}`);
    return response.status(200).json({ message: 'Final report received successfully.' });

  } catch (error) {
    // 7. 错误处理
    console.error('Error writing final report file:', error);
    // 在响应中也包含错误信息，方便前端调试
    return response.status(500).json({ message: 'Internal Server Error.', error: error.message });
  }
}
