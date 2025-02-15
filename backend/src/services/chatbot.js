const OpenAI = require("openai");
const axios = require("axios");

const client = new OpenAI({
    organization: process.env.OpenAI_Org,
    project: process.env.OpenAI_proj,
});

const prompt = `  
 I will use your responce as the search prompt in Goolge to search for the relevant information to answer, please generate a 15-word searchPrompt_text please for seatch in <SearchPromt> ... </SearchPrompt>
`


// async function getLLMResponse(message) {

//     // 调用 OpenAI 接口，生成聊天回复
//     const response = await client.chat.completions.create({
//         messages: message,
//         model: "gpt-4o-mini", 
//     });

//     // 提取回复内容
//     const reply = response.choices[0].message.content;
//     return reply;
// }

// async function getLLMResponseWithInternet(message) {

async function getLLMResponse(message) {

    let searchPromptStr = '';
    let maxAttempts = 5;
    let attempts = 0;

    while( (!searchPromptStr || searchPromptStr.length < 10) && attempts < maxAttempts){
        attempts++;
        const response_1 = await client.chat.completions.create({
            messages: [...message, {role : 'user', content: prompt }],
            model: "gpt-4o", 
        });

        console.log('res1', response_1.choices[0].message.content);
        const responseText = response_1.choices[0].message.content;
        const innerContent = responseText.replace(/<SearchPrompt>(.*?)<\/SearchPrompt>/g, "$1");
        console.log('inner', innerContent);
        

        const API_KEY = process.env.GOOGLE_API;
        const CX = process.env.GOOGLE_CX;
        // console.log('API_KEY', API_KEY);

        if (!API_KEY || !CX) {
        throw new Error(
            "Please set GOOGLE_API and GOOGLE_CX in your .env file",
        );
        }
        const url = "https://www.googleapis.com/customsearch/v1";
        const params = {
        key: API_KEY,
        cx: CX,
        q: innerContent + " after:2015-09-01", // + " site:arxiv.org",
        num: 5, // fetch more results so we have a pool to rank
        //   siteSearch: "arxiv.org",
        //   siteSearchFilter: "i",
        };

        const searchResponse = await axios.get(url, { params });

        const searchPrompt = searchResponse.data.items;
        searchPromptStr = JSON.stringify(searchPrompt);
    }
    console.log(searchPromptStr);



    const response_2 = await client.chat.completions.create({
        messages: [...message, {role : 'user', content: "<Reference>" + searchPromptStr + "</Reference>" + 
        " 用这些辅助资料回答用户的问题. 回答要有深度, 引用了之后要在引用的那个句子后面紧跟着列出引用的link并用<Link></Link>框起来,比如<Link>https://www.moomoo.com/jp/hans/learn/detail-top-10-ai-semiconductor-us-stocks-117068-240329007</Link>"}],
        model: "gpt-4o", 
    });
    const finalReply = response_2.choices[0].message.content
    console.log(finalReply);


    return finalReply;
}

module.exports = {
    getLLMResponse,
};