import OpenAI from "openai";

function getClient() {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not set");
  }
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1",
  });
}

export async function analyzeKnowledge(input: string) {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `你是一个考研知识体系分析助手。用户会输入今天学习的内容和笔记，请提取知识点并以JSON格式返回：
{
  "knowledgeNodes": [
    {
      "name": "知识点名称",
      "subject": "所属科目（数学/英语/408/政治）",
      "parent": "父知识点（可选）",
      "related": ["相关知识点"],
      "prerequisites": ["前置知识"],
      "notes": "AI对这段学习内容的总结"
    }
  ]
}`,
      },
      { role: "user", content: input },
    ],
    temperature: 0.3,
  });

  try {
    const content = response.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return null;
  }
}

export async function analyzeMistake(content: string) {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `你是一个考研错题分析助手。分析错题并以JSON返回：
{
  "knowledgePoint": "考察的知识点",
  "errorType": "错误类型",
  "errorReason": "错误原因分析",
  "relatedKnowledge": ["关联知识点"],
  "suggestion": "复习建议"
}`,
      },
      { role: "user", content: content },
    ],
    temperature: 0.3,
  });

  try {
    const cnt = response.choices[0]?.message?.content || "{}";
    const jsonMatch = cnt.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return null;
  }
}

export async function generateDailyReview(data: {
  subjects: { name: string; hours: number }[];
  taskCompletion: string;
  streak: number;
}) {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `你是考研学习复盘助手。根据学习数据生成复盘，JSON格式：
{
  "rating": 4,
  "summary": "整体评价",
  "strengths": "优势",
  "problems": "存在问题",
  "suggestion": "明日建议"
}`,
      },
      {
        role: "user",
        content: JSON.stringify(data),
      },
    ],
    temperature: 0.5,
  });

  try {
    const cnt = response.choices[0]?.message?.content || "{}";
    const jsonMatch = cnt.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return null;
  }
}

export async function generateStudyAdvice(recentData: string) {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content:
          "你是考研学习顾问。根据用户近7天学习记录，给出一条简洁、具体的学习建议（80字以内）。只返回建议文本，不需要JSON。",
      },
      { role: "user", content: recentData },
    ],
    temperature: 0.5,
  });

  return response.choices[0]?.message?.content || "继续按计划推进，保持节奏。";
}
