// 女性向（乙女线）端到端用的假 AI：只认开局设定、写正文、记账、成书几类调用，别的给空 JSON 或短句。
// 与 ai.js 一样是 OpenAI 兼容服务；由 qa.sh 式的 start 起在 MOCK_PORT。
const http = require('http');
const fs = require('fs');
const PORT = Number(process.env.MOCK_PORT || 3742);
let n = 0, lastStory = '', lastBook = '', calls = [];
const dump = (f, s) => { try { fs.writeFileSync(f, String(s || '')); } catch (_) {} };   // 测试从文件读提示词（不走网络接口，免得被扫描器当成 SSRF）

function resolveSetting() {
  return JSON.stringify({ y: 740, m: 2, d: 15, yearLabel: '天宝九载', polity: '唐', place: '京兆府长安县', placeShort: '长安', name: '沈令仪', real: false, gender: '女', age: 19, role: '盐商之女', native: '', whereBasis: '', traces: [], inferred: [], adjust: [], people: [], queries: [] });
}
function opening() {
  return JSON.stringify({
    setup: { name: '沈令仪', gender: '女', age: 19, role: '盐商之女', identityModule: 'commoner', yearLabel: '天宝九载', gregorianYear: 740, month: 2, day: 15, place: '京兆府长安县', polity: '唐', unit: '两', cash: 300, household: [{ relation: '父', name: '沈崇', age: 46 }, { relation: '母', name: '卢氏', age: 42 }] },
    world: { overview: '大唐天宝九载，长安承平，西市胡商云集，朝中李林甫当政。', events: [], upcoming: [] },
    meters: [{ 项: '名声', 值: '尚可' }], groups: [{ 人群: '长安市民', 值: 50 }],
    estate: { assets: [{ name: '西市铺面', qty: '一间', value: 200 }], income: [{ item: '铺租', amount: 30 }], expense: [{ item: '家用', amount: 20 }], projects: [] },
    hints: ['去西市'], goals: [{ term: '长远', text: '替父亲守住西市的铺子', why: '家中生计所系', status: '新' }], turnSummary: '开场'
  });
}
function romanceStory() {
  const scenes = [
    '上元夜，长安西市的灯棚一直搭到街尾。沈令仪提着一盏兔子灯，被人潮推得站不稳，灯骨撞上了一个人的肩。\n那人穿玄色圆领袍，腰间玉带压得极低，回身时先看灯，才看她。灯纸破了一角，烛火晃了晃，没灭。\n「姑娘的灯，」他伸手扶住灯柄，声音不高，「再挤就要烧了。」\n她抬头，认出这是近来常来铺子里买纸的裴姓客人，却不知他官居何职。两人隔着一盏破灯站了片刻，谁也没有先走。',
    '次日铺子里，裴砚果然又来。他把一匣新灯纸放在柜上，说是赔昨夜的灯。父亲沈崇在里间咳嗽，她出来招呼，给他倒了一盏茶。\n他问起铺子今年的生意，她答得谨慎，只说胡商的纸贵，本钱压得重。他听了，手指在茶盏边缘停了停，说城南有个纸坊，价钱公道，可以替她引见。\n她送他到门口，看见巷口停着一辆不起眼的青帷车，车夫见了他，起身行礼。她心里忽然明白，这人恐怕不是寻常主顾。',
    '三日后，她照他说的去城南纸坊，果然省下两成本钱。回程落雨，她在坊门檐下躲雨，青帷车却停在街对面。\n车帘掀开，裴砚递出一把伞，说顺路。她迟疑了一瞬，还是上了车。车厢里很静，只听见雨点敲在车顶上。\n「你父亲的身子，」他忽然说，「我认识一位太医署的人。」\n她攥着伞柄，没有立刻答话。这份好意太重，重得让人不敢伸手去接。'
  ];
  const t = scenes[(n - 1) % scenes.length];
  return t + '\n【情缘】好感+4 猜疑-1 身份+1 清议+2';
}
function chapter() { return '第一回　灯前破纸逢玄客　帘外春雨借青车\n\n长安上元，灯棚如昼。朱雀大街以东，坊门次第落钥，唯独西市不禁夜行——胡商年年上元投保义坊，官府睁一只眼闭一只眼，灯棚便从金光门一路搭到市署前。沈令仪提着一盏兔子灯挤在人潮里，灯骨撞上了一个人的肩。\n那人穿玄色圆领袍，腰间玉带压得极低，回身时先看灯，才看她。灯纸破了一角，烛火晃了晃，竟没有灭。「姑娘的灯，」他伸手扶住灯柄，声音不高，「再挤就要烧了。」她抬头道谢，认出这是近来常来铺子里买纸的裴姓客人，却不知他官居何职。两人隔着一盏破灯站了片刻，谁也没有先走。\n次日铺子里，裴砚果然又来，放下一匣新灯纸，说是赔昨夜的灯。父亲沈崇在里间咳嗽，她出来招呼，给他倒了一盏茶。他问起铺子今年的生意，她答得谨慎，只说胡商的纸贵，本钱压得重。他听了，手指在茶盏边缘停了停，说城南有个纸坊，价钱公道，可以替她引见。她送他到门口，看见巷口停着一辆不起眼的青帷车，车夫见了他，起身行礼。她心里忽然明白，这人恐怕不是寻常主顾。\n三日后，她照他说的去城南纸坊，果然省下两成本钱。回程落雨，她在坊门檐下躲雨，青帷车停在街对面。车帘掀开，裴砚递出一把伞，说顺路。她迟疑了一瞬，还是上了车。车厢里很静，只听见雨点敲在车顶上。「你父亲的身子，」他忽然说，「我认识一位太医署的人。」她攥着伞柄，没有立刻答话。这份好意太重，重得让人不敢伸手去接。'; }
function openingNarrative() {
  return '天宝九载二月，长安。西市的晨鼓刚过，胡商的驼队正从金光门进来，纸铺的门板一块块卸下。\n你叫沈令仪，十九岁，父亲沈崇做了半辈子纸生意，今春咳疾总不见好，铺子里里外外渐渐都落到你手上。母亲卢氏催你少抛头露面，可账上的本钱压得紧，你不得不出面。\n这日傍晚收市，一个穿玄色圆领袍的年轻客人来买灯纸。他挑纸很内行，问了产地，又问价，临走时多看了你一眼，说西市上元夜会搭灯棚，姑娘家的灯，最好多备几盏。\n你送他到门口，看见巷口停着一辆青帷车。车夫见了他，起身行礼，称他「郎君」。你没有多问，只把这句话记在心里。\n【情缘】好感+3 猜疑+0 身份+1 清议+0';
}
function ledger() { return JSON.stringify({ elapsedDays: 5, turnSummary: '过了几日，铺中照常营业' }); }

http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', async () => {
    if (req.url.startsWith('/prompts')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ story: lastStory, book: lastBook, calls })); }    if (req.url.startsWith('/v1/web-search')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ code: 200, data: { webPages: { value: [] } } })); }
    if (req.url.startsWith('/search?')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ results: [] })); }
    if (req.url.includes('/w/api.php')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ query: { pages: { '-1': { title: '', missing: '' } }, search: [] }, entities: {} })); }
    if (req.url.includes('/models')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'deepseek-v4-pro' }] })); }
    const body = JSON.parse(b || '{}'); const msgs = body.messages || []; if (!msgs.length) { res.writeHead(404); return res.end('{}'); }
    const p = msgs.map(m => m.content).join('\n'); n++;
    calls = calls.concat([{ n, head: p.slice(0, 120).replace(/\s/g, ' '), json: !!body.response_format, stream: !!body.stream, open: p.includes('【开局】'), rom: p.includes('女性向恋爱线') }]).slice(-30);
    let content;
    if (p.includes('先把玩家的设定落到真实历史里')) content = resolveSetting();
    else if (/账房兼史官|账房（短记账单）/.test(p)) content = p.includes('【开局】') ? opening() : ledger();
    else if (p.includes('【开局】')) { lastStory = p; dump('romance_story_prompt.txt', p); content = openingNarrative(); }   // 开局正文：提示词里同时有【开局】和女性向块，先认【开局】，也记下来供测试断言
    else if (p.includes('推演人') || p.includes('你只推演')) content = JSON.stringify({ acts: [], brief: [] });
    else if (p.includes('【女性向恋爱线')) { lastStory = p; dump('romance_story_prompt.txt', p); content = romanceStory(); }
    else if (p.includes('章回体言情')) { lastBook = p; dump('romance_book_prompt.txt', p); content = chapter(); }
    else if (p.includes('账房兼史官') && p.includes('【开局】')) content = opening();
    else if (/账房兼史官|账房（短记账单）/.test(p)) content = ledger();
    else if (p.includes('立一份档案')) content = JSON.stringify({ people: [] });
    else if (p.includes('还没给玩家看')) content = JSON.stringify({ fixes: [], doubts: [] });
    else if (body.response_format || /只输出一个 JSON|只输出JSON|输出一个 JSON/.test(p)) content = '{}';
    else content = '天宝九载，长安。铺子里的日子照常过着。';
    if (body.stream) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const parts = content.match(/[\s\S]{1,40}/g) || []; let i = 0;
      const t = setInterval(() => { if (i < parts.length) res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: parts[i++] } }] }) + '\n\n'); else { res.write('data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] }) + '\n\n'); res.write('data: [DONE]\n\n'); res.end(); clearInterval(t); } }, 2);
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }], usage: {} }));
  });
}).listen(PORT, () => console.log('romance mock ' + PORT));
