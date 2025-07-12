// /api/log.js

// 引入Node.js的文件系统模块，用于写入文件
import fs from 'fs/promises';
import path from 'path';

// 这是Vercel云函数处理请求的标准方式
export default async function handler(request, response) {
  // 1. 安全性检查：只接受POST请求
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed. Please use POST.' });
  }

  // 2. 数据接收与解析
  // request.body 包含了前端发送过来的所有数据
  const incomingData = request.body;

  // 如果没有数据，返回错误
  if (!incomingData || incomingData.length === 0) {
    return response.status(400).json({ message: 'No data received.' });
  }

  try {
    // 3. 准备存储
    // 我们将把数据存储在Vercel临时的 /tmp 目录下
    // 这不是永久存储，但对于比赛演示和短期数据收集足够了！
    const storagePath = path.join('/tmp', 'gamelogs');
    await fs.mkdir(storagePath, { recursive: true }); // 确保文件夹存在

    // 为每个玩家的每次会话创建一个独立的文件
    // 从数据的第一条记录中获取 participantId 和 sessionId
    const participantId = incomingData[0]?.participantId || 'unknown_participant';
    const sessionId = incomingData[0]?.sessionId || 'unknown_session';
    const timestamp = Date.now();
    const fileName = `${participantId}_${sessionId}_${timestamp}.json`;
    const filePath = path.join(storagePath, fileName);

    // 4. 将数据写入文件
    // JSON.stringify的第三个参数2是为了让JSON文件格式化，更易读
    await fs.writeFile(filePath, JSON.stringify(incomingData, null, 2));
    
    console.log("--- START OF GAME DATA ---");
    console.log(jsonDataString);
    console.log("--- END OF GAME DATA ---");
    
    // 5. 成功响应
    // 告诉前端：“我成功收到并保存了你的数据！”
    console.log(`Successfully saved log to: ${filePath}`);
    return response.status(200).json({ message: 'Log received successfully.' });

  } catch (error) {
    // 6. 错误处理
    console.error('Error writing log file:', error);
    return response.status(500).json({ message: 'Internal Server Error.' });
  }
}
