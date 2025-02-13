// search.js
require('dotenv').config();
const { extractTextFromPDF } = require("../services/pdfParser");
const OpenAI = require("openai");
const fs = require("fs");

const axios = require('axios');



// async function googleCustomSearch(query) {
//     const url = 'https://www.googleapis.com/customsearch/v1';
//     const params = {
//       key: API_KEY,
//       cx: CX,
//       q: query + ' after:2024-09-01' + ' site:arxiv.org',
//       num: 5, // you can adjust the number of results
//       siteSearch: "arxiv.org",
//       siteSearchFilter: "i" // "i" means include only results from this site
//     };
  
//     try {
//       const response = await axios.get(url, { params });
//       if (response.status === 200) {
//         const results = response.data;
//         let arxivIdList = [];
//         // The API returns results in results.items array.
//         if (results.items && Array.isArray(results.items)) {
//           for (const item of results.items) {
//             // Use regex to extract arXiv id from the link
//             const m = item.link.match(/arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d+)/);
//             if (m) {
//               arxivIdList.push('https://arxiv.org/pdf/' + m[1]);
//             }
//           }
//         }
//         return Array.from(new Set(arxivIdList));
//       }
//       return [];
//     } catch (error) {
//       if (error.response) {
//         console.error("Error data:", error.response.data);
//         console.error("Status:", error.response.status);
//       } else {
//         console.error("Error message:", error.message);
//       }
//       return null;
//     }
//   }
  

async function fetchCitationCount(arxivId) {
    // Construct the Semantic Scholar API URL for the given arXiv ID.
    const url = `https://api.semanticscholar.org/graph/v1/paper/arXiv:${arxivId}?fields=citationCount`;
    try {
      const response = await axios.get(url);
      if (response.status === 200 && response.data) {
        return response.data.citationCount || 0;
      }
    } catch (error) {
      console.error(`Error fetching citation count for ${arxivId}:`, error.message);
    }
    return 0;
  }
  
  async function googleCustomSearch(jobId, pdfPath) {
    console.log()

    const client = new OpenAI({
      organization: process.env.OpenAI_Org,
      project: process.env.OpenAI_proj,
    });

    if (!fs.existsSync(pdfPath)) {
      console.log("PDF not found.")
      return null;
    }
    // 2. 提取PDF文本
    const text = await extractTextFromPDF(pdfPath);

    const words = text.split(/\s+/); // \s+ matches any whitespace (spaces, tabs, newlines)

    const first100Words = words.slice(0, 300);
    const title = first100Words.join(" ");
    console.log(title);

    const searchPrompt = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content: "Here is the beginning of the paper that I want to search for its relevant paper <paper>" + first100Words + '</paper>. I want you to give me a 30 words search prompt <Search>...<Search> that I will use to search for the other relevant paper in Arxiv, dont put the Paper name into the search prompt, more about topics and fields, methodologies and stuff',
       },
      ],
      model: "gpt-4o-mini",
      // model: "o1",
    });

    let searchPrompt_text = searchPrompt.choices[0].message.content;
    const parsedText = searchPrompt_text.substring(8, searchPrompt_text.length - 9);
    console.log("\n\n\n0, ", parsedText);


    const API_KEY = process.env.GOOGLE_API;
    const CX = process.env.GOOGLE_CX;
    // console.log('API_KEY', API_KEY);


    if (!API_KEY || !CX) {
      throw new Error("Please set GOOGLE_API and GOOGLE_CX in your .env file");
    }
    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      key: API_KEY,
      cx: CX,
      q: searchPrompt_text + ' after:2024-09-01' + ' site:arxiv.org',
      num: 10, // fetch more results so we have a pool to rank
      siteSearch: "arxiv.org",
      siteSearchFilter: "i"
    };
  
    try {
      const response = await axios.get(url, { params });
      if (response.status === 200) {
        const results = response.data;
        let papers = [];
        if (results.items && Array.isArray(results.items)) {
          for (const item of results.items) {
            const m = item.link.match(/arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d+)/);
            if (m) {
              // Store both the link and the arXiv ID
              papers.push({ 
                arxivId: m[1], 
                pdfLink: 'https://arxiv.org/pdf/' + m[1],
                title: item.title // Extract the paper title
              });
            }
          }
        }
        
        // For each paper, fetch its citation count from Semantic Scholar API.
        // const papersWithCitations = await Promise.all(papers.map(async paper => {
        //   const citationCount = await fetchCitationCount(paper.arxivId);
        //   return { ...paper, citationCount };
        // }));
        
        // Sort papers descending by citationCount.
        // papersWithCitations.sort((a, b) => b.citationCount - a.citationCount);
        
        console.log(papers);
        // Return the top three results.
        return papers;
      }
      return [];
    } catch (error) {
      if (error.response) {
        console.error("Error data:", error.response.data);
        console.error("Status:", error.response.status);
      } else {
        console.error("Error message:", error.message);
      }
      return null;
    }
  }


async function main() {
  const query = "Large Language Model";
  console.log(`Searching for: "${query}"...`);
  const data = await googleCustomSearch(query);
  if (data) {
    console.log("Search results:", JSON.stringify(data, null, 2));
  } else {
    console.error("No data returned from search.");
  }
}

module.exports = {
  googleCustomSearch,
};

// main();


// /**
//  * utils.js
//  * 转换自 Python 版本，用于论文搜索、解析和 TOC 生成等功能
//  * 
//  * 依赖: axios, cheerio, adm-zip, fs, path
//  */
// require('dotenv').config();

// const axios = require('axios');
// const cheerio = require('cheerio');
// // const AdmZip = require('adm-zip');
// const fs = require('fs');
// const path = require('path');

// // 请先申请 Google Search API key 并替换下面的值
// const GOOGLE_KEY = 'AIzaSyCEvLQKLZtC5WH9YNMBOOa_SstrQyhkUDw'; //process.env.GOOGLE_API;
// console.log("Google API:", GOOGLE_KEY)
// if (GOOGLE_KEY === 'your google keys') {
//   throw new Error("Please add your google search key!");
// }

// /**
//  * 使用 Google Serper API 搜索 arxiv id
//  * @param {string} query
//  * @param {number} num
//  * @param {string} end_date 格式为 "YYYYMMDD"
//  * @returns {Promise<string[]>} 去重后的 arxiv id 数组
//  */
// async function googleSearchArxivId(query, num = 10, end_date = null) {
//   const url = "https://google.serper.dev/search";
//   let searchQuery = `${query} site:arxiv.org`;
//   if (end_date) {
//     try {
//       const dateObj = new Date(
//         parseInt(end_date.slice(0, 4)),
//         parseInt(end_date.slice(4, 6)) - 1,
//         parseInt(end_date.slice(6))
//       );
//       const formattedDate = dateObj.toISOString().slice(0, 10);
//       searchQuery = `${query} before:${formattedDate} site:arxiv.org`;
//     } catch (e) {
//       searchQuery = `${query} site:arxiv.org`;
//     }
//   }
//   const payload = {
//     q: searchQuery,
//     num: num,
//     page: 1
//   };
//   const headers = {
//     'X-API-KEY': GOOGLE_KEY,
//     'Content-Type': 'application/json'
//   };
//   for (let i = 0; i < 3; i++) {
//     try {
//       console.log('before')
//       const response = await axios.post(url, payload, { headers });

//     //   const response = await axios.post(url, JSON.stringify(payload), { headers });
//       console.log('response', response);
//       if (response.status === 200) {
//         const results = response.data;
//         let arxivIds = [];
//         if (results.organic && Array.isArray(results.organic)) {
//           for (const paper of results.organic) {
//             const m = paper.link.match(/arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d+)/);
//             if (m) {
//               arxivIds.push(m[1]);
//             }
//           }
//         }
//         return Array.from(new Set(arxivIds));
//       }
//     } catch (e) {
//       console.warn(`google search failed, query: ${query}`);
//       continue;
//     }
//   }
//   return [];
// }

// /**
//  * 解析 metadata（传入一个字符串数组）
//  * @param {string[]} metas
//  * @returns {object} { meta_list, meta_string, authors, title, journal }
//  */
// function parseMetadata(metas) {
//   const cleaned = metas.map(item => item.replace(/\n/g, ' '));
//   const metaString = cleaned.join(' ');
//   let authors = '', title = '', journal = '';
//   if (metas.length === 3) {
//     [authors, title, journal] = metas;
//   } else {
//     const metaStr = metaString.replace(/\.\s\d{4}[a-z]?\./, '.');
//     const regex = /^(.*?\.\s)(.*?)(\.\s.*|$)/s;
//     const match = metaStr.match(regex);
//     if (match) {
//       authors = match[1] ? match[1].trim() : "";
//       title = match[2] ? match[2].trim() : "";
//       journal = match[3] ? match[3].trim() : "";
//       if (journal.startsWith('. ')) {
//         journal = journal.slice(2);
//       }
//     }
//   }
//   return {
//     meta_list: metas,
//     meta_string: metaString,
//     authors,
//     title,
//     journal
//   };
// }

// /**
//  * 根据一个 Cheerio 的 ul 元素生成引用字典
//  * @param {Cheerio} ulElement
//  * @returns {object} citation dict
//  */
// function createDictForCitation(ulElement) {
//   let citationDict = {};
//   ulElement.find("li").each((i, li) => {
//     const idAttr = li.attribs.id;
//     const spans = cheerio(li).find('span.ltx_bibblock');
//     let metas = [];
//     spans.each((j, span) => {
//       metas.push(cheerio(span).text().trim());
//     });
//     citationDict[idAttr] = parseMetadata(metas);
//   });
//   return citationDict;
// }

// /**
//  * 生成全文目录（toc）——遍历所有标题标签
//  * @param {CheerioStatic} $
//  * @returns {Array} toc 数组
//  */
// function generateFullToc($) {
//   const toc = [];
//   const stack = [[0, toc]];
//   const headingTags = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5 };

//   Object.keys(headingTags).forEach(tag => {
//     $(tag).each((i, elem) => {
//       const level = headingTags[tag];
//       const title = $(elem).text();
//       while (stack.length && stack[stack.length - 1][0] >= level) {
//         stack.pop();
//       }
//       const currentLevel = stack[stack.length - 1][1];
//       // 查找父 section（有 id 的）
//       let section = $(elem).closest('section[id]');
//       let sectionId = section.length ? section.attr('id') : null;
//       const newEntry = { title, id: sectionId, subsections: [] };
//       currentLevel.push(newEntry);
//       stack.push([level, newEntry.subsections]);
//     });
//   });
//   return toc;
// }

// /**
//  * 递归解析 tag 内部文本，忽略某些标签
//  * @param {CheerioStatic} $
//  * @param {CheerioElement} tag
//  * @param {Array} localText
//  */
// function parseText($, tag, localText) {
//   const ignoreTags = ['a', 'figure', 'center', 'caption', 'td', 'h1', 'h2', 'h3', 'h4', 'sup'];
//   $(tag).contents().each((i, child) => {
//     if (child.type === 'text') {
//       localText.push($(child).text());
//     } else if (child.type === 'comment') {
//       // 忽略注释
//     } else if (child.type === 'tag') {
//       if (ignoreTags.includes(child.name) || ($(child).attr('class') && $(child).attr('class').split(' ')[0] === 'navigation')) {
//         return;
//       } else if (child.name === 'cite') {
//         let hrefs = [];
//         $(child).find('a.ltx_ref').each((j, a) => {
//           hrefs.push($(a).attr('href').replace('#', '').trim());
//         });
//         localText.push('~\\cite{' + hrefs.join(', ') + '}');
//       } else if (child.name === 'img' && $(child).attr('alt')) {
//         const mathTxt = $(child).attr('alt');
//         if (mathTxt.length < 300000) localText.push(mathTxt);
//       } else if ($(child).attr('class') && ( $(child).attr('class').split(' ')[0] === 'ltx_Math' || $(child).attr('class').split(' ')[0] === 'ltx_equation')) {
//         const mathTxt = $(child).text();
//         if (mathTxt.length < 300000) localText.push(mathTxt);
//       } else if (child.name === 'section') {
//         return;
//       } else {
//         parseText($, child, localText);
//       }
//     }
//   });
// }

// /**
//  * 清理文本
//  * @param {string} text
//  * @returns {string} cleaned text
//  */
// function cleanText(text) {
//   const deleteItems = ['=-1', '\t', '\xa0', '[]', '()', 'mathbb', 'mathcal', 'bm', 'mathrm', 'mathit', 'mathbf', 'mathbfcal', 'textbf', 'textsc', 'langle', 'rangle', 'mathbin'];
//   deleteItems.forEach(item => {
//     text = text.split(item).join('');
//   });
//   text = text.replace(/ +/g, ' ');
//   text = text.replace(/[[,]+]/g, '');
//   text = text.replace(/\.(?!\d)/g, '. ');
//   text = text.replace(/bib\. bib/g, 'bib.bib');
//   return text;
// }

// /**
//  * 移除包含停用词的章节，并提取其文本
//  * @param {Array} toc
//  * @param {CheerioStatic} $
//  * @param {Array} stopWords
//  * @returns {Array} filtered toc
//  */
// function removeStopWordSectionsAndExtractText(toc, $, stopWords = ['references', 'acknowledgments', 'about this document', 'apopendix']) {
//   function hasStopWord(title, stopWords) {
//     return stopWords.some(stopWord => title.toLowerCase().includes(stopWord.toLowerCase()));
//   }
//   function extractText(entry, $) {
//     if (entry.id) {
//       const section = $(`#${entry.id}`);
//       if (section.length) {
//         let localText = [];
//         parseText($, section, localText);
//         if (localText.length) {
//           entry.text = cleanText(localText.join(''));
//         }
//       }
//     }
//     return entry;
//   }
//   function filterAndUpdateToc(entries) {
//     const filtered = [];
//     for (let entry of entries) {
//       if (!hasStopWord(entry.title, stopWords)) {
//         extractText(entry, $);
//         entry.subsections = filterAndUpdateToc(entry.subsections);
//         filtered.push(entry);
//       }
//     }
//     return filtered;
//   }
//   return filterAndUpdateToc(toc);
// }

// /**
//  * 解析 HTML 文件并生成 paper 文档对象
//  * @param {string} htmlFile HTML 内容
//  * @returns {object} document 对象 { title, abstract, sections, references }
//  */
// function parseHtml(htmlFile) {
//   const $ = cheerio.load(htmlFile, { xmlMode: false });
//   const title = $('head title').text().replace(/\n/g, ' ');
//   const abstract = $('.ltx_abstract').text();
//   const citationElement = $('.ltx_biblist');
//   const citationDict = citationElement.length ? createDictForCitation(citationElement) : {};
//   let toc = generateFullToc($);
//   toc = removeStopWordSectionsAndExtractText(toc, $, stopWords = []);
//   return {
//     title,
//     abstract,
//     sections: toc,
//     references: citationDict
//   };
// }

// /**
//  * 通过 arxiv id 搜索章节信息
//  * @param {string} entry_id 格式为 "2307.00235"
//  * @param {RegExp|string} cite 正则表达式或模板字符串
//  * @returns {Promise<object|null>} sections2title 对象或 null
//  */
// async function searchSectionByArxivId(entry_id, cite) {
//   console.warn("Using searchSectionByArxivId may return wrong title because of ar5iv parsing citation error.");
//   if (!/^\d+\.\d+$/.test(entry_id)) {
//     return null;
//   }
//   const url = `https://ar5iv.labs.arxiv.org/html/${entry_id}`;
//   try {
//     const response = await axios.get(url);
//     if (response.status === 200) {
//       const htmlContent = response.data;
//       if (!htmlContent.includes('https://ar5iv.labs.arxiv.org/html')) {
//         console.warn(`Invalid ar5iv HTML document: ${url}`);
//         return null;
//       }
//       let document;
//       try {
//         document = parseHtml(htmlContent);
//       } catch (e) {
//         console.warn(`Wrong format HTML document: ${url}`);
//         return null;
//       }
//       let sections;
//       try {
//         // 这里假设 document.sections[0].subsections 存在
//         sections = get2ndSection(document.sections[0].subsections);
//       } catch (e) {
//         console.warn(`Get subsections error`);
//         return null;
//       }
//       let sections2title = {};
//       for (let [k, v] of Object.entries(sections)) {
//         k = k.split("\n").join(" ");
//         sections2title[k] = new Set();
//         const bibs = v.match(new RegExp(cite, 's')) || [];
//         for (let bib of bibs) {
//           let parts = bib.split(",");
//           for (let b of parts) {
//             // 如果 b 在 document.references 中则取 title
//             if (!document.references[b]) continue;
//             sections2title[k].add(document.references[b].title);
//           }
//         }
//         if (sections2title[k].size === 0) {
//           delete sections2title[k];
//         } else {
//           sections2title[k] = Array.from(sections2title[k]);
//         }
//       }
//       return sections2title;
//     } else {
//       console.warn(`Failed to retrieve content. Status code: ${response.status}`);
//       return null;
//     }
//   } catch (e) {
//     console.warn(`An error occurred: ${e}`);
//     return null;
//   }
// }

// /**
//  * 保留字符串中所有字母，并转为小写
//  * @param {string} s
//  * @returns {string}
//  */
// function keepLetters(s) {
//   return s.split('').filter(c => /[a-zA-Z]/.test(c)).join('').toLowerCase();
// }

// /**
//  * 根据 arxiv id 搜索论文（先查询本地数据库，再用 arxiv API 作为备选）
//  * @param {string} arxiv_id
//  * @returns {Promise<object|null>}
//  */
// async function searchPaperByArxivId(arxiv_id) {
//   // 备用：使用 arxiv API 模拟搜索（这里仅作简单示例）
//   try {
//     const url = `http://export.arxiv.org/api/query?id_list=${arxiv_id}`;
//     const response = await axios.get(url);
//     if (response.status === 200) {
//       // 简单解析 XML 结果，这里只提取第一个匹配
//       const mTitle = response.data.match(/<title>([\s\S]*?)<\/title>/);
//       const mSummary = response.data.match(/<summary>([\s\S]*?)<\/summary>/);
//       if (mTitle && mSummary) {
//         return {
//           arxiv_id,
//           title: mTitle[1].replace(/\n/g, ' '),
//           abstract: mSummary[1].replace(/\n/g, ' '),
//           sections: "",
//           source: 'SearchFrom:arxiv'
//         };
//       }
//     }
//   } catch (e) {
//     console.warn(`Failed to search arxiv id: ${arxiv_id}`);
//     return null;
//   }
//   return null;
// }

// /**
//  * 根据 title 搜索 arxiv id
//  * @param {string} title
//  * @returns {Promise<string|null>}
//  */
// async function searchArxivIdByTitle(title) {
//   const url = "https://arxiv.org/search/?" + new URLSearchParams({
//     query: title,
//     searchtype: 'title',
//     abstracts: 'hide',
//     size: 200,
//   }).toString();
  
//   try {
//     const response = await axios.get(url);
//     if (response.status === 200) {
//       const htmlContent = response.data;
//       const $ = cheerio.load(htmlContent);
//       let results = [];
//       // 判断是否是论文列表
//       if ($('meta[charset]').length) {
//         if ($('p.is-size-4.has-text-warning').text().includes("Sorry")) {
//           console.warn(`Failed to find results by Arxiv Advanced Search: ${title}`);
//           return null;
//         }
//         $('li.arxiv-result').each((i, elem) => {
//           const resultTitle = $(elem).find("p.title.is-5.mathjax").text().trim();
//           const idText = $(elem).find('p.list-title.is-inline-block a').text().trim();
//           const id = idText.replace("arXiv:", "");
//           if (resultTitle && id) {
//             results.push({ title: resultTitle, id });
//           }
//         });
//       } else if ($('html[xmlns]').length) { // 单篇论文
//         const match = $('title').text().match(/\[(.*?)\]\s*(.*)/);
//         if (match) {
//           const id = match[1];
//           const paperTitle = match[2];
//           results.push({ title: paperTitle, id });
//         }
//       }
//       if (results.length) {
//         for (const result of results) {
//           const normalize = str => str.toLowerCase().replace(/\./g, '').replace(/ /g, '').replace(/\n/g, '');
//           if (normalize(result.title) === normalize(title)) {
//             return result.id;
//           }
//         }
//         return null;
//       }
//       console.warn(`Failed to parse the html: ${url}`);
//       return null;
//     } else {
//       console.warn(`Failed to retrieve content. Status code: ${response.status}`);
//       return null;
//     }
//   } catch (e) {
//     console.warn(`An error occurred while search_arxiv_id_by_title: ${e}`);
//     return null;
//   }
// }

// /**
//  * 根据 title 搜索论文
//  * @param {string} title
//  * @returns {Promise<object|null>}
//  */
// async function searchPaperByTitle(title) {
//   const titleId = await searchArxivIdByTitle(title);
//   if (!titleId) return null;
//   const id = titleId.split('v')[0];
//   return await searchPaperByArxivId(id);
// }

// /**
//  * 递归提取所有子章节的 text（假设 sections 为数组结构，每个 section 包含 title、text 和 subsections）
//  * @param {Array} sections
//  * @returns {object} key 为 section title, value 为 text
//  */
// function getSubsection(sections) {
//   let res = {};
//   for (let section of sections) {
//     if (section.text && section.text.trim() !== "") {
//       res[section.title.trim()] = section.text.trim();
//     }
//     const sub = getSubsection(section.subsections || []);
//     res = { ...res, ...sub };
//   }
//   return res;
// }

// /**
//  * 获取第一层章节的文本，合并子章节文本
//  * @param {Array} sections
//  * @returns {object}
//  */
// function get1stSection(sections) {
//   let res = {};
//   for (let section of sections) {
//     const sub = getSubsection(section.subsections || []);
//     if (section.text && section.text.trim() !== "") {
//       res[section.title.trim()] = section.text.trim();
//     } else {
//       res[section.title.trim()] = "";
//     }
//     for (let key in sub) {
//       res[section.title.trim()] += sub[key].trim();
//     }
//   }
//   let resNew = {};
//   for (let k in res) {
//     if (!k.toLowerCase().includes("appendix"))
//       resNew[k.split("\n").join(" ").trim()] = res[k];
//   }
//   return resNew;
// }

// /**
//  * 获取第二层章节，组合第一层标题和子章节标题
//  * @param {Array} sections
//  * @returns {object}
//  */
// function get2ndSection(sections) {
//   let res = {};
//   for (let section of sections) {
//     const sub = get1stSection(section.subsections || []);
//     if (section.text && section.text.trim() !== "") {
//       res[section.title.trim()] = section.text.trim();
//     }
//     for (let k in sub) {
//       res[`${section.title.trim()} ${k.trim()}`] = sub[k].trim();
//     }
//   }
//   let resNew = {};
//   for (let k in res) {
//     if (!k.toLowerCase().includes("appendix"))
//       resNew[k.split("\n").join(" ").trim()] = res[k];
//   }
//   return resNew;
// }

// /**
//  * 计算微观指标 (tp, fp, fn)
//  * @param {Set} predSet
//  * @param {Set} labelSet
//  * @returns {Array} [tp, fp, fn]
//  */
// function calMicro(predSet, labelSet) {
//   if (labelSet.size === 0) return [0, 0, 0];
//   if (predSet.size === 0) return [0, 0, labelSet.size];
//   let tp = 0;
//   for (let x of predSet) {
//     if (labelSet.has(x)) tp++;
//   }
//   let fp = predSet.size - tp;
//   let fn = labelSet.size - tp;
//   return [tp, fp, fn];
// }

// // 导出所有函数
// module.exports = {
//   googleSearchArxivId,
//   parseMetadata,
//   createDictForCitation,
//   generateFullToc,
//   parseText,
//   cleanText,
//   removeStopWordSectionsAndExtractText,
//   parseHtml,
//   searchSectionByArxivId,
//   keepLetters,
//   searchPaperByArxivId,
//   searchArxivIdByTitle,
//   searchPaperByTitle,
//   getSubsection,
//   get1stSection,
//   get2ndSection,
//   calMicro,
// };

// // const { googleSearchArxivId } = require('./utils');

// async function main() {
//   try {
//     const query = "Deep Learning";
//     console.log(`Searching arxiv IDs for query: "${query}"...`);
//     // 参数：查询字符串，返回数量（10个），截止日期（例如 "20240715"）
//     const ids = await googleSearchArxivId(query, 10, "20240715");
//     console.log("Found arxiv IDs:", ids);
//   } catch (err) {
//     console.error("Error during search:", err);
//   }
// }

// main();


