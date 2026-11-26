// 户口经济与矿（2026-11-26 项目主人：「各地的人口和经济，矿产你可自己思考和根据时代估算，确保准确，有增长率，跟时代挂钩」）：
// 每处州府都有户口（著录的按年率推到当年、没著录的照分区底账）；乱世减、盛世增；矿产照开闭年代，城里点得着、算得进矿课；
// 流寇照灾荒、加派、裁驿、兵变聚起来，就食流动、破城就粮，官军近了会散，也能出钱招抚
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof popBaseAt === 'function' && typeof kouchMonthly === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    // 1 分区：济南是山东、沧州是河北、开封是中原、临安是江南、扬州是江淮或江南（不当山东）
    const R = n => { const g = { 济南: [117.0, 36.65], 沧州: [116.9, 38.3], 开封: [114.35, 34.79], 临安: [120.17, 30.29], 广州: [113.26, 23.13], 凉州: [102.63, 37.93] }[n]; return popRegionOf(g[0], g[1]); };
    for (const [n, want] of [['济南', '山东'], ['沧州', '河北'], ['开封', '中原'], ['临安', '江南'], ['广州', '岭南'], ['凉州', '河西']]) if (R(n) !== want) bad.push(`${n}归了${R(n)}，该是${want}`);
    // 2 每处都有户口；著录的照增长率推到当年（京兆府 742 年著录 362921 户，到 750 年该多几个点，不该原样）
    const s = newSave({ name: '陈子昂', gender: '男', age: 40, role: '布衣', gregorianYear: 750, month: 6, day: 1, place: '长安', polity: '唐' }); S = s;
    for (const n of ['长安', '苏州', '广州', '成都', '凉州', '沙州']) { const v = popOf(s, n); if (!v || !(v.pop || v.hh)) bad.push(n + '没有户口'); }
    const jz = popOf(s, '京兆府'); if (!jz || !(jz.hh > 362921 * 1.02 && jz.hh < 362921 * 1.15)) bad.push('京兆府没按增长率从 742 年推到 750 年：' + JSON.stringify(jz && { hh: jz.hh, why: jz.why }));
    const base = popBaseAt('某州', 750, { lon: 120.17, lat: 30.29 }); if (!base || !base.pop || base.nong == null || base.shang == null) bad.push('没著录的州府没有底账：' + JSON.stringify(base));
    // 3 增长率跟时代走：天宝年间关中在增，安史乱中河北在减，北宋江南在增，明末在减
    if (!(popGrowRate(750, '关中') > 0)) bad.push('天宝年间关中不在增');
    if (!(popGrowRate(760, '河北') < 0)) bad.push('安史乱中河北不在减');
    if (!(popGrowRate(1100, '江南') > 0.5)) bad.push('北宋江南增得太慢');
    if (!(popGrowRate(1640, '江南') < 0)) bad.push('明末江南不在减');
    // 4 矿产：开闭年代对得上（佛山铁明以后、个旧锡明以后、铜录山汉以后闭）
    const at = (lon, lat, y) => minesNear({ lon, lat }, y).map(m => m[0]);
    if (!at(113.1, 23.0, 1760).includes('佛山铁')) bad.push('1760 年佛山没有铁');
    if (at(113.1, 23.0, 1200).includes('佛山铁')) bad.push('1200 年佛山不该有铁');
    if (!at(103.15, 23.36, 1700).includes('个旧锡')) bad.push('1700 年个旧没有锡');
    if (at(114.95, 30.1, 1200).includes('铜录山铜')) bad.push('1200 年铜录山不该还在采铜');
    // 5 城里点得着矿、矿课进账
    const s2 = newSave({ name: '沈万三', gender: '男', age: 45, role: '皇帝', gregorianYear: 1760, month: 6, day: 1, place: '北京', polity: '清' }); S = s2;
    s2.territory = [{ place: '佛山', pop: 200000, loyalty: 60 }, { place: '大同', pop: 100000, loyalty: 60 }];
    const ch = cityHtml(s2, '佛山'); if (!/矿产/.test(ch) || !/佛山铁/.test(ch)) bad.push('佛山城池卡没写铁矿');
    const MR = mineRevenue(s2); if (!(MR.sum > 0) || !MR.list.some(x => /佛山铁|大同煤/.test(x.name))) bad.push('矿课没算进来：' + JSON.stringify(MR));
    // 6 流寇：连年旱蝗、加派、民心散，才有人聚起来；聚起来会挪地方、破城就粮；官军近了会散；也能招抚
    const s3 = newSave({ name: '孙传庭', gender: '男', age: 45, role: '陕西巡抚', gregorianYear: 1628, month: 6, day: 1, place: '西安', polity: '明' }); S = s3;
    const M = mapUnits(s3); s3.cities = s3.cities || {};
    for (const u of M.L2) if (u.lat > 33 && u.lat < 40 && u.lon > 104 && u.lon < 112) s3.cities[u.n] = { tax: '重', loyalty: 20, nong: 30, ev: [{ ym: Math.floor(ymOf(s3.clock)), k: '旱', text: '夏旱', lost: 500 }] };
    let raids = 0;
    for (let i = 0; i < 30; i++) { s3.clock = CAL.nextMonth(s3.clock); const L = kouchMonthly(s3, 1); raids += L.filter(x => /破.*就粮/.test(x)).length; }
    if (!arr(s3.bands).length) bad.push('明末陕西连年灾荒，一路流寇也没起');
    const bd = arr(s3.bands)[0];
    if (bd && !(bd.hist.length > 1)) bad.push('流寇起了却不挪地方');
    if (!raids) bad.push('流寇没有破城就粮');
    // 官军进剿：把一支官军放在流寇头上，人少的流寇该散
    if (bd) { bd.men = 500; s3.forces = arr(s3.forces).concat([{ name: '官军', owner: '明', troops: 5000, at: bd.at, status: '追剿' }]); for (let i = 0; i < 3; i++) { s3.clock = CAL.nextMonth(s3.clock); kouchMonthly(s3, 1); } if (arr(s3.bands).some(x => x === bd)) bad.push('五千官军压在头上，五百流寇还没散'); }
    // 招抚：给人给钱，部众编进自己的兵
    const s4 = newSave({ name: '孙传庭', gender: '男', age: 45, role: '陕西巡抚', gregorianYear: 1629, month: 6, day: 1, place: '西安', polity: '明' }); S = s4; s4.money = { cash: 1e7, unit: '两' };
    const h = hereXY(s4); s4.bands = [{ id: 'kx', name: '王二', leader: '王二', kind: '饥民', cause: '岁饥', at: geoCenter(s4), lon: h.lon, lat: h.lat, men: 5000, morale: 50, org: 40, heat: 8, hist: [[1629, 6, geoCenter(s4), h.lon, h.lat, '5千']], held: [] }];
    const T = rebelThreat(s4); let amn = null; if (T && T.band) amn = threatAct(s4, 'amnesty');
    if (!amn || arr(s4.forces).some(f => /王二部/.test(f.name)) === false) bad.push('出钱招抚没把人编进来：' + JSON.stringify(amn));
    if (arr(s4.bands).length) bad.push('招抚了流寇还在外头');
    return bad;
  });
  if (errs.length) { console.log('不合格 ' + errs.slice(0, 3).join('；')); process.exit(1); }
  if (out.length) { console.log('不合格 ' + out.length + ' 处：' + out.slice(0, 8).join('；')); process.exit(1); }
  console.log('户口经济·增长·矿产·流寇：都照时代走了');
  await b.close();
})();
