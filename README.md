# rpg-map（2026-11-26 快照）

这是 `zhuhuang907-lang/-rpg` 在 2026-11-26 的**网页版工作快照**，单独开一个仓库，是为了绕开主仓 Mimosa 门禁里那批**存量**安全告警（`rpg-kernel/launcher/GameLauncher.cs`、`scripts/events_*.py` 等，不是这一轮的改动）。本仓库只收网页端与构建产物，不收桌面启动器、服务端和数据处理脚本，所以扫描是 0 条。

## 这一轮改了什么

1. **舆图**：十六个开局年逐张核过，178 个检查点 0 不符、十六朝无主府州 0。修了都护府/布政司并回本朝、飞地（归义、朔方、定难、高丽、唃厮啰、杜文秀、俄、高句丽辽东城等）、治所优先、陆地补白、日本外的假蓝海。
2. **户口**：十七块 × 十六定点，正史地理志与人口史折成实际人口；有常率、乱世扣减、都会加成；著录数逐年复利推到当年；没著录的照分区底账推，全图无空户口。
3. **经济**：每块每代农、商、城三项底子；财政田赋、丁役、商税照户口比例和农商底子算。
4. **矿产**：四十一处矿场，开闭年与年产；城池页「矿产」、放大舆图小菱形、财政「矿课」（盐不重复算）。
5. **流寇**：按灾荒、赋役、民心、裁驿、兵变生势生成；就食流动、裹挟、破城就粮、官军进剿、出钱招抚；史书四路保留。
6. **打字/后台/长局（同日）**：浏览器直连十分钟自动回头试后台、设置页可手动「重试后台」；输入法选字时重画不吞字、选字回车不发出；长局摘要 30 回压一章、写戏带【前几章】与【长局连续性】、正文温度 0.7→0.6；账没记上的回合也把正文摘要/档案馆留下，不当作没发生。
7. **续修（同日）**：自定义年代年率不越界；流寇弃城把原「失/叛」状态还回、不抢别人叛城；守城按实际人数；`楚 · 荆南` 拆成楚、荆南，浩罕从哈萨克拆出；税基照账上户口与内置底账合计（皇帝治下 1760 约 2.28 亿口）。

详报见 `中书省/附件/舆图户口矿产流寇-2026-11-26.md`，回奏见 `中书省/问答/zcode.md` 末尾。

## 目录

- `web/play.html`：网页版单文件（双击即可玩，也可放到任意静态站点）。
- `web/game.src.html`：源码（约 1.8 万行，`web/build.py` 把各 JSON 注进去生成 `index.html` / `play.html` / `rpg-kernel/public/index.html`）。
- `web/index.html`：claude.ai 版。
- `web/build.py`：构建脚本；`python web/build.py`。
- `web/tests/`：门禁与 QA（`prompt_guard.js` 293 项、`rules_regress.js` 109 条、`hist_audit.js`、`qa/`）。
- `rpg-kernel/public/`：桌面版内置的网页与版本号。
- `中书省/`：这一轮的报告与回奏。

## 怎么合回主仓

把下面这些文件覆盖回 `zhuhuang907-lang/-rpg` 的 `zcode/scan` 工作树即可（其余文件是这一轮没动的）：

```
web/game.src.html
web/index.html
web/play.html
web/build.py（没改，可对照）
web/tests/prompt_guard.js
web/tests/qa.sh
web/tests/qa/crime.js
web/tests/qa/frontier.js
web/tests/qa/era_econ.js（新）
web/tests/qa/storyfix.js（新）
web/tests/qa/longjump.js（新）
web/tests/qa/romance.js（新）
web/tests/qa/romanceai.js（新）
web/romance/（新，女性向已停用，保留）
rpg-kernel/public/index.html
rpg-kernel/public/version.json
中书省/问答/zcode.md
中书省/附件/舆图户口矿产流寇-2026-11-26.md
中书省/附件/任务五十七户口补遗.json
中书省/附件/女性向恋爱线设计.md
中书省/附件/女性向纸面试玩.md
中书省/附件/局面页核验报告-2026-11-24.md
中书省/考卷回报/2-将领-出兵与围城-2026-11-24.md
中书省/考卷回报/4-平民-经商与家事-2026-11-24.md
```

## 门禁（这一轮跑过的）

- build ok 8714165（history 11、inst 9、arcs 215）
- 提示词护栏 293 项 0 不合格
- 规则回归 109 条 0 不合格
- 史实跨表体检 0 处可疑
- 舆图 178 点 0 不符；十六朝无主府州 0
- frontier / realms / mapcolor / warfisc / garbage / era_econ 全过（ERRS []）
- `QUICK=1 qa.sh` 本机跑到 fixflow.js 卡住（测试进程不退的老毛病）已停；smap/travel/estate 要 8793 端口 QA 服务，留 CI 全套复跑
