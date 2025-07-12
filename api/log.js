// /api/log.js (汇总报告接收+健壮日志版)

import fs from 'fs/promises';
import path from 'path';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed. Please use POST.' });
  }

  const finalReport = request.body;

  if (!finalReport || typeof finalReport !== 'object' || !finalReport.sessionId) {
    // 在返回错误前，先把收到的东西打印出来
    console.error("Received an invalid or empty report. Request body:", JSON.stringify(finalReport));
    return response.status(400).json({ message: 'Invalid or malformed report data received.' });
  }

  try {
    const storagePath = path.join('/tmp', 'final_reports');
    await fs.mkdir(storagePath, { recursive: true });

    const sessionId = finalReport.sessionId;
    const timestamp = finalReport.reportTimestamp || Date.now();
    const fileName = `${sessionId}_${timestamp}.json`;
    const filePath = path.join(storagePath, fileName);

    // 【【【确保这部分代码存在！！！】】】
    const jsonDataString = JSON.stringify(finalReport, null, 2);
    
    // 将整个报告对象格式化后写入文件
    await fs.writeFile(filePath, jsonDataString);
    
    // 在日志中直接打印完整的数据！
    console.log("--- START OF FINAL REPORT DATA ---"); // 我把名字改得更清晰了
    console.log(jsonDataString);
    console.log("--- END OF FINAL REPORT DATA ---");

    // 成功响应
    console.log(`Successfully saved final report to: ${filePath}`);
    return response.status(200).json({ message: 'Final report received successfully.' });

  } catch (error) {
    console.error('Error writing final report file:', error);
    return response.status(500).json({ message: 'Internal Server Error.', error: error.message });
  }
}
