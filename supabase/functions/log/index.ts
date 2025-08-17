// supabase/functions/log/index.ts (带数据净化的最终版)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * 递归地清理一个对象，将 NaN, Infinity, -Infinity 转换为 null，
 * 这是 PostgreSQL jsonb 类型所要求的。
 * @param {any} data - 要清理的数据
 * @returns {any} 清理后的数据
 */
function sanitizeForPostgres(data: any): any {
  if (data === null || typeof data !== 'object') {
    if (typeof data === 'number' && !isFinite(data)) {
      return null; // 将 NaN, Infinity, -Infinity 替换为 null
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForPostgres(item));
  }

  const sanitizedObj: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      sanitizedObj[key] = sanitizeForPostgres(data[key]);
    }
  }
  return sanitizedObj;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    if (!payload || !payload.sessionId || !payload.participantId) {
      throw new Error("Invalid payload structure. Missing sessionId or participantId.");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('MY_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- 【【【 核心修复 】】】 ---
    // 在插入数据库之前，对 events 数组进行数据净化
    const sanitizedEvents = sanitizeForPostgres(payload.events);
    // --- 【【【 修复结束 】】】 ---

    const { error } = await supabaseAdmin.from('logs').insert({
      session_id: payload.sessionId,
      participant_id: payload.participantId,
      is_final_chunk: payload.isFinalChunk,
      events: sanitizedEvents, // 使用净化后的数据
    });

    if (error) {
      console.error('Supabase error:', error.message)
      throw error
    }

    return new Response(JSON.stringify({ message: 'Data stored successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(String(err.message), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})