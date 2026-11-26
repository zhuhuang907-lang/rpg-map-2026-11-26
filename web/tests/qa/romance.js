// 女性向（乙女线）端到端：自定开局勾女性向 → 开局 → 四值记账 → 面板块 → 连走三回 → 存档续玩 → 言情成书
// 假 AI 在 romanceai.js（qa.sh 的 start romanceai.js）。总开关 ROMANCE_ENABLED=false 时整条跳过，只验页面无女性向字样。
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8741) + '/');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);

  // 总开关停用（ROMANCE_ENABLED=false）：表单里没有女性向开关，页面没有「女性向/乙女/情缘」字样，整条测试跳过
  const enabled = await p.evaluate(() => typeof ROMANCE_ENABLED === 'undefined' || ROMANCE_ENABLED === true);
  if (!enabled) {
    const gone = await p.evaluate(() => !document.querySelector('#cRomance') && !/女性向|乙女|情缘/.test(document.body.innerText));
    console.log('ERRS', JSON.stringify(errs));
    console.log(gone ? 'ROMANCE SKIP（总开关停用中；页面无女性向字样，代码保留）' : '不合格：总开关停用了，页面上仍有女性向字样或开关');
    await b.close();
    if (!gone) process.exit(1);
    return;
  }

  const out = { steps: [] };
  const readP = f => { try { return fs.readFileSync(f, 'utf8'); } catch (_) { return ''; } };   // 假 AI 把收到的提示词落到工作目录，这里照文件断言
  const storyPrompt = () => readP('romance_story_prompt.txt');
  const bookPromptTxt = () => readP('romance_book_prompt.txt');

  const checked0 = await p.$eval('#cRomance', e => e.checked);
  out.defaultOff = checked0 === false;
  await p.check('#cRomance');
  await p.selectOption('#cEra', '唐前期'); await p.fill('#cYear', '天宝九载'); await p.fill('#cPolity', '唐'); await p.fill('#cPlace', '长安');
  await p.selectOption('#cKind', '商人'); await p.fill('#cRole', '盐商之女');
  await p.fill('#cAge', '19'); await p.selectOption('#cReal', '虚'); await p.fill('#cName', '沈令仪');
  await p.selectOption('#cWorld', '史实'); await p.selectOption('#cLead', '权臣'); await p.fill('#cLeadName', '裴砚'); await p.selectOption('#cSType', '欢喜冤家');
  await p.click('#bCustomStart');
  await p.waitForSelector('#said', { timeout: 180000 });
  await p.waitForFunction(() => { const b = document.querySelector('#bSend'); return b && !b.disabled; }, null, { timeout: 180000 }).catch(() => {});
  await p.waitForTimeout(500);
  await p.screenshot({ path: SHOT + 'romance-intro.png', fullPage: false });

  out.state = await p.evaluate(() => {
    const R = S && S.romance || {};
    const last = (S.chat || []).filter(x => x.reply).slice(-1)[0] || {};
    return { enabled: !!R.enabled, lead: R.leadName, type: R.stype, world: R.world, stats: R.stats, used: (R.used || []).length, leak: /【情缘】/.test(String(last.reply || '')), female: (S.protagonist || {}).gender };
  });
  out.steps.push('opening');
  out.panel = await p.evaluate(() => /情缘/.test(document.body.innerText) && /好感/.test(document.body.innerText));
  { const t = storyPrompt(); out.prompt = t ? { romance: t.includes('【女性向恋爱线'), type: t.includes('欢喜冤家'), seed: /本回火花/.test(t), lead: t.includes('裴砚') } : null; }

  for (let i = 0; i < 3; i++) {
    await p.waitForFunction(() => { const b = document.querySelector('#bSend'); return b && !b.disabled; }, null, { timeout: 180000 });
    await p.fill('#said', ['去西市看灯', '请裴砚到铺子里喝茶', '随他去城南纸坊'][i]);
    await p.click('#bSend');
    await p.waitForFunction(() => !document.querySelector('.thinking'), null, { timeout: 180000 });
    await p.waitForTimeout(600);
  }
  out.after = await p.evaluate(() => ({ stats: S.romance.stats, used: S.romance.used.slice(), turns: S.turn, leak: (S.chat || []).some(x => /【情缘】/.test(String(x.reply || ''))), log: (S.romance.log || []).length }));
  { const t = storyPrompt(); out.promptAfter = t ? { romance: t.includes('【女性向恋爱线'), seed: /本回火花/.test(t), stats: /好感 \d+/.test(t) } : null; }
  // 存档续玩：刷新页面接着玩，女性向的四值、男主、用过的火花要都在
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => { const b = document.querySelector('#btnContinue') || [...document.querySelectorAll('button')].find(x => /接着玩|继续/.test(x.textContent || '')); if (b) b.click(); });
  await p.waitForFunction(() => typeof S !== 'undefined' && S && S.romance && S.romance.enabled && !!document.querySelector('#said'), null, { timeout: 60000 }).catch(() => {});
  out.resume = await p.evaluate(() => ({ enabled: !!(S && S.romance && S.romance.enabled), lead: S && S.romance && S.romance.leadName, favor: S && S.romance && S.romance.stats && S.romance.stats.favor, usedN: S && S.romance && S.romance.used ? S.romance.used.length : -1, turn: S && S.turn }));

  await p.click('[data-tab="arc"]');
  await p.waitForSelector('[data-book="romance"]', { timeout: 60000 }).catch(() => {});
  const bookVisible = await p.$('[data-book="romance"]') != null;
  out.bookButton = bookVisible;
  if (bookVisible) {
    await p.evaluate(() => document.querySelectorAll('details.custom').forEach(d => { if (d.querySelector('[data-book]')) d.open = true; }));
    await p.click('[data-book="romance"]');
    try { await p.waitForSelector('[data-bookdl="romance"]', { timeout: 180000 }); out.bookDone = true; }
    catch (_) { out.bookDone = false; }
  }
  await p.screenshot({ path: SHOT + 'romance-play.png', fullPage: false });
  { const t = bookPromptTxt(); out.bookPrompt = t ? { romance: t.includes('章回体言情'), lead: t.includes('裴砚'), type: t.includes('欢喜冤家') } : null; }

  console.log('ERRS', JSON.stringify(errs));
  // 断言：哪一条不满足就报不合格、退出码非零（qa.sh 照这个拦）
  const bad = [];
  if (errs.length) bad.push('页面报错');
  if (!out.defaultOff) bad.push('开关默认没关');
  if (!out.state || !out.state.enabled || out.state.female !== '女') bad.push('开局没进女性向');
  if (!out.state || out.state.leak) bad.push('【情缘】泄漏到正文');
  if (!out.panel) bad.push('情缘面板没显示');
  if (!out.prompt || !out.prompt.romance || !out.prompt.lead) bad.push('开局提示词没带女性向块');
  if (!out.promptAfter || !out.promptAfter.seed || !out.promptAfter.stats) bad.push('本回提示词没带火花与四值');
  if (!out.after || out.after.used.length < 2 || new Set(out.after.used).size !== out.after.used.length) bad.push('火花没轮换去重');
  if (!out.after || out.after.stats.favor <= out.state.stats.favor) bad.push('四值没记账');
  if (!out.resume || !out.resume.enabled || out.resume.usedN !== out.after.used.length) bad.push('存档续玩丢了女性向数据');
  if (!out.bookButton) bad.push('言情成书按钮没出现');
  if (!out.bookDone) bad.push('言情没写成');
  if (!out.bookPrompt || !out.bookPrompt.romance || !out.bookPrompt.lead) bad.push('成书提示词没带男主');
  if (bad.length) { console.log('不合格：' + bad.join('、')); console.log('ROMANCE', JSON.stringify(out)); process.exit(1); }
  console.log('ROMANCE', JSON.stringify(out));
  await b.close();
})();
