// 长跳与重复结算回归（2026-11-22 扫描报告「新增测试缺口」）：
// 商铺两回合只入账一次；spanMonths「三年后/到年底」；牢狱字段齐、赎金非 0、无队伍也有押牢面板；
// 赈济月内冷却、忠诚落到城册；第一回跨年年终卡不丢；未编成营口粮只扣一处。
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('dialog', d => d.accept());
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  await idle();
  const bad = []; const ok = (c, m) => { if (!c) bad.push(m); };
  // 1. spanMonths
  const sm = await p.evaluate(() => ({ three: spanMonths('', '三年后'), endJan: spanMonths('', '到年底', 1), endNov: spanMonths('', '到年底', 11), spring: spanMonths('', '开春', 10), over3: spanMonths('', '过三年'), plain: spanMonths('', '随便说说话') }));
  ok(sm.three === 36, '「三年后」应为 36 个月：' + sm.three);
  ok(sm.endJan === 11 && sm.endJan >= 10, '1 月说「到年底」应约 11-12 个月：' + sm.endJan);
  ok(sm.endNov <= 2, '11 月说「到年底」应 1-2 个月：' + sm.endNov);
  ok(sm.spring >= 3 && sm.spring <= 5, '10 月说「开春」应 4 个月上下：' + sm.spring);
  ok(sm.over3 === 36, '「过三年」应 36 个月：' + sm.over3);
  ok(sm.plain === 0, '平常话不推时间：' + sm.plain);
  // 2. 商铺两回合只入账一次：shopMonthly 每回现钱增量 === b.revenue
  const shop = await p.evaluate(() => {
    const s = S; s.business = [{ name: '测铺', kind: '米行', prog: 1, capital: 10000, lo: 0.045, hi: 0.045, place: '扬州府', clerks: 0, revenue: 0, cost: 0, log: [] }];
    const c0 = s.money.cash || 0; shopMonthly(s, 1); const t1 = s.business[0].revenue, d1 = Math.round((s.money.cash - c0) * 100) / 100;
    const c1 = s.money.cash; s.clock = CAL.addDays(s.clock, 31); shopMonthly(s, 1); const t2 = s.business[0].revenue, d2 = Math.round((s.money.cash - c1) * 100) / 100;
    return { t1, d1, t2, d2, once1: d1 === t1, once2: d2 === t2 };
  });
  ok(shop.once1 && shop.once2 && shop.t1 > 0 && shop.t2 > 0, '商铺每回现钱增量应恰等于当月利润（不重复入账）：' + JSON.stringify(shop));
  // 3. 牢狱字段齐、赎金非 0、无队伍也有押牢面板
  const jail = await p.evaluate(() => {
    const s = S; s.jail = null; s.business = []; s.forces = []; s.party = null;
    jailCheck(s, { outcome: '大败', deadUs: 5 }, '官军', '高邮州');
    const J = s.jail || {}; const html = jhHtml(s);
    return { has: !!s.jail, where: J.where, charge: J.charge, since: J.since, cost: J.cost, ransom: J.ransom, panel: html.includes('设法脱逃') && html.includes('罪名'), ransomOk: J.ransom > 0 };
  });
  ok(jail.has && jail.where && jail.charge && jail.since && jSONable(jail.cost) && jail.ransomOk, '被俘后牢狱字段应齐、赎金应大于 0：' + JSON.stringify(jail));
  ok(jail.panel, '没有队伍也该有押牢面板（越狱/赎身/说话）');
  function jSONable(x) { return x != null; }
  // 4. 赈济：月内第二次被拦、忠诚落到城册
  const relief = await p.evaluate(() => {
    const s = S; s.jail = null; s.cities = {}; s.territory = []; s.realm = { granary: 100000 }; if (s.gov) { s.gov.scope = 'local'; s.gov.stats['民心'] = 50; }
    s.career = { office: '江都县知县', rank: '正七品' };   // 地方官线：myDomain 的辖区照主角此刻所在算
    const here = myDomain(s).places[0]; if (!here) return { skip: '没有辖区' };
    const r1 = cityDo(s, here, 'relief'); const C = (s.cities || {})[here] || {}; const blocked = C.reliefYM != null;
    const r2 = cityDo(s, here, 'relief');
    return { here, r1: String(r1 || ''), r2: String(r2 || ORGMSG), loyalty: C.loyalty, blocked, secondBlocked: r2 == null };
  });
  ok(relief.r1.includes('赈济') && relief.secondBlocked && relief.loyalty != null, '赈济当月第二次应被拦、忠诚应记进城册：' + JSON.stringify(relief));
  // 5. 第一年跨年年终卡：把钟拨到腊月、推到次年二月，yearEnd(旧年) 应出卡
  const yearCard = await p.evaluate(() => {
    const s = S; s.jail = null; s.career = { office: '', rank: '' }; s.clock.y = 1757; s.clock.m = 12; s.clock.d = 20; s.yearSnap = yearSnap(s); s.yearCards = [];
    const y0 = 1757; s.clock.y = 1758; s.clock.m = 2; s.chronicle.push({ turn: s.turn, when: timeText({ y: 1757, m: 11, d: 5 }), who: s.protagonist.name, what: '这年冬里进了一批纸' });
    const card = yearEnd(s, y0); s.clock.y = 1757; s.clock.m = 12;
    return card ? { y: card.y, lines: card.lines.length } : null;
  });
  ok(yearCard && yearCard.y === 1757, '第一回跨年年终卡不该丢：' + JSON.stringify(yearCard));
  // 6. 未编成营口粮只扣一处：同一步里 realmUpkeep 不再扣未编成营的粮（armyMonthly 负责）
  const grain = await p.evaluate(() => {
    const s = S; s.forces = [{ name: '乡勇', leader: s.protagonist.name, troops: 1000, grain: '12000', quality: '弱', at: '扬州府' }]; s.business = []; s.campaigns = []; s.battles = [];
    const acc = []; realmUpkeep(s, 30, acc); const g0 = s.forces[0].grain;
    armyMonthly(s, 1); const g1 = s.forces[0].grain;
    const num = v => Number(String(v).replace(/[^\d.]/g, '')) || 0;
    return { g0: num(g0), g1: num(g1), once: Math.round(1000 * 0.6) === Math.round(num(g0) - num(g1)) };
  });
  ok(grain.once && grain.g0 === 12000, '未编成营的口粮只该由 armyMonthly 扣（一个月六斗/人）：' + JSON.stringify(grain));
  console.log('ERRS', JSON.stringify(errs));
  if (errs.length) bad.push('页面报错');
  if (bad.length) { console.log('不合格：' + bad.join('；')); await b.close(); process.exit(1); }
  console.log('LONGJUMP OK');
  await b.close();
})();
