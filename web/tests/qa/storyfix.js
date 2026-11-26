// 打字与长局（2026-11-26 项目主人：「彻底解除打字的bug……剧情长期出问题，非常的random，deepseek每次都不调用后台」）：
// 浏览器直连只是临时退路，后台恢复要自己回来；输入法选字时不许重画吞字、回车不许发出；三十年摘要要压成章、写戏材料带前几章与长局连续性
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof deskSample === 'function' && typeof compactMemory === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    // 1 直连退路：满五分钟回头试后台，后台通了就清掉直连
    const oldL = localSample, oldD = directSample, oldMode = MODE;
    MODE = 'local'; DS_DIRECT = true; DS_DIRECT_AT = Date.now(); DS_DIRECT_TRIES = 0;
    localSample = async () => ({ text: 'local' }); directSample = async () => ({ text: 'direct' });
    const r1 = await deskSample('x', {});
    DS_DIRECT_AT = Date.now() - 6 * 60e3;
    const r2 = await deskSample('x', {});
    if (r1.text !== 'direct') bad.push('后台还连着却先走了直连');
    if (r2.text !== 'local' || DS_DIRECT) bad.push('满五分钟没回头试后台：' + r2.text + ' / ' + DS_DIRECT);
    localSample = oldL; directSample = oldD; MODE = oldMode; DS_DIRECT = false;
    // 2 输入法选字：重画不吞字；选字中的回车不发出
    S = newSave({ name: '测', gender: '男', age: 40, role: '布政使', gregorianYear: 1760, month: 6, day: 1, place: '北京', polity: '清' });
    S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; TAB = 'board'; render0();
    const ta = document.querySelector('#said'); ta.focus(); ta.value = '测';
    ta.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); IME_ON = true; ta.value = '测试';
    render0();
    if (!document.querySelector('#said') || document.querySelector('#said').value !== '测试') bad.push('选字时重画把输入框的字吞了');
    let clicks = 0; const btn = document.querySelector('#bSend'), oldClick = btn.click; btn.click = () => { clicks++; };
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: false, keyCode: 13 }));
    if (clicks) bad.push('输入法选字时的回车被当成发出了');
    btn.click = oldClick; ta.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); IME_ON = false;
    // 3 长局：三十回摘要压成一章，写戏材料带【前几章】与长局连续性
    S = newSave({ name: '测', gender: '男', age: 40, role: '布政使', gregorianYear: 1760, month: 6, day: 1, place: '北京', polity: '清' });
    S.summaries = Array.from({ length: 30 }, (_, i) => ({ turn: i + 1, when: '第' + (i + 1) + '年', text: '第' + (i + 1) + '回的事' })); S.chapters = [];
    const oldC = callClaude; callClaude = async () => ({ text: '早年三十回压成的一章：人名地名数目都在。' });
    await compactMemory(S); callClaude = oldC;
    if (!(S.chapters.length === 1 && S.summaries.length === 6)) bad.push('三十回摘要没压成一章：' + S.chapters.length + '/' + S.summaries.length);
    if (!/【前几章/.test(blocks(S, true))) bad.push('写戏材料没带【前几章】');
    if (!/【长局连续性】/.test(recapTail(S, '看看', 'auto'))) bad.push('写戏结尾没交代长局连续性');
    { const full = JSON.stringify(storyInput(S, '看看', 'auto', null, false, null)); if (!/【前几章/.test(full) || !/【长局连续性】/.test(full)) bad.push('整段写戏材料里没带前几章/长局连续性'); }
    // 4 开局以后（省钱模式）压章节仍用原型号，不降快型号
    { const oldMode = MODE, oldKey = KEY, oldS = SAMPLE; MODE = 'local'; KEY = { has: true, tail: 'x', model: 'deepseek-v4-pro' };
      S = newSave({ name: '测', gender: '男', age: 40, role: '布政使', gregorianYear: 1760, month: 6, day: 1, place: '北京', polity: '清' }); S.settledAt = 1;
      let seen = null; SAMPLE = async (i, o) => { seen = o; return { text: 'x' }; };
      try { await callClaude('x', null, { json: false, kind: '修史' }); } catch (_) {}
      SAMPLE = oldS; MODE = oldMode; KEY = oldKey;
      if (!seen || seen.fast) bad.push('压章节在省钱模式下被降成快型号'); }
    return bad;
  });
  if (errs.length) { console.log('ERRS ' + JSON.stringify(errs.slice(0, 3))); process.exit(1); }
  if (out.length) { console.log('不合格 ' + out.length + ' 处：' + out.slice(0, 6).join('；')); process.exit(1); }
  console.log('打字/后台/长局：选字不吞、发出不乱、后台会回来、旧事压成章');
  await b.close();
})();
