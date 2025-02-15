const OpenAI = require("openai");

const client = new OpenAI({
    organization: process.env.OpenAI_Org,
    project: process.env.OpenAI_proj,
});

async function getLLMResponse(message) {

    // 调用 OpenAI 接口，生成聊天回复
    const response = await client.chat.completions.create({
        messages: message,
        model: "gpt-4o-mini", // 可根据需要选择其他模型
    });

    // 提取回复内容
    const reply = response.choices[0].message.content;
    return reply;
}

module.exports = {
    getLLMResponse,
};