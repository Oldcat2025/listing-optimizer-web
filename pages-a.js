/* ══ 页面组 ①工作台 ②我的商品 ③生成文案 ══ */
/* ───────── ① 工作台 ───────── */
page('dash-todo', {
  roles:['运营','审核','管理员'],
  guide:[
    '<b>先看下面的大数字</b>，知道今天整体有多少事。',
    '<b>再看中间的流程图</b>——那是你这个角色从头到尾要做的几件事，哪个环节有数字，就点哪个。',
    '<b>最后看下面的清单</b>，逐条处理。处理完这里会自动消失。'
  ],
  spec:{
    q:'我现在该做什么？—— 按角色显示各自的工作流程和轮到自己的事。',
    acts:['点流程图环节跳转','进入待办条目','切换角色视角'],
    wf:['无（纯读）'],
    reads:['run','listing_final','certificate','sku','import_batch','job_queue'],
    writes:['无'],
    limits:[
      '不在此页做任何放行 / 覆写动作，只做跳转',
      '运营只看到自己提交的任务',
      '流程图上的数字必须是真实待办数，<b>不允许显示估算或缓存值</b>'
    ]
  },
    body:function(){
    var R = (typeof ROLE !== 'undefined') ? ROLE : '管理员';
    var el = '<div id="dash-todo-root">' + ghost('正在加载待办…') + '</div>';
    setTimeout(function(){
      Promise.all([
        API.table('SKU_输入表', {}, 200),
        API.table('定稿输出表', {}, 200)
      ]).then(function(rs){
        var root = document.getElementById('dash-todo-root');
        if (!root) return;
        var sku = (rs[0].ok && rs[0].data && rs[0].data.data) || [];
        var draft = (rs[1].ok && rs[1].data && rs[1].data.data) || [];
        function cnt(rows, key, val){ return rows.filter(function(x){ return String(x[key]||'').toUpperCase() === val; }).length; }
        var pending = cnt(sku,'处理状态','PENDING');
        var processing = cnt(sku,'处理状态','PROCESSING');
        var review = cnt(sku,'处理状态','REVIEW_REQUIRED');
        var completed = cnt(sku,'处理状态','COMPLETED');
        var failed = cnt(sku,'处理状态','FAILED');
        var skuRows = sku.filter(function(x){ return x && x['SKU']; });
        /* [fix 09-16al] 排序口径：**新创建/待处理的排最前**（原先新商品的「处理状态」不在已知取值里 → 被判成 5 → 沉到列表最底部，客户反馈"新建的找不到"）。
   分组：0 需人工处理 / 1 新创建·待处理 / 2 生成中 / 3 已完成 / 4 失败 / 5 其他 */
        function statusRank(s){
          var u = String(s||'').toUpperCase().trim();
          if (u === 'REVIEW_REQUIRED') return 0;
          if (u === '' || u === '待处理' || u === '新创建' || u === 'PENDING' || u === 'NEW') return 1;
          if (u === 'PROCESSING') return 2;
          if (u === 'COMPLETED' || u === 'SUCCESS') return 3;
          if (u === 'FAILED') return 4;
          return 5;
        }
        skuRows.sort(function(a,b){ var ra=statusRank(a['处理状态']), rb=statusRank(b['处理状态']); if(ra!==rb) return ra-rb; return String(b['更新时间']||'').localeCompare(String(a['更新时间']||'')); });
        function rowList(rows, actionTxt, btnCls){
          return rows.map(function(x){
            var sku = x['SKU']||'';
            var st = String(x['处理状态']||'').toUpperCase();
            var go = (actionTxt === '去审核') ? 'rev-action'
                   : (st === 'COMPLETED' || st === 'REVIEW_REQUIRED') ? 'rev-detail'
                   : 'sku-detail';
            return [
              thumbHtml(x['产品图片URL']),
              '<span class="m">'+sku+'</span>',
              x['目标市场']||'—',
              '<span title="' + statusTip(x['处理状态']) + '" style="cursor:help">' + chip(statusCn(x['处理状态']), st==='COMPLETED'?'ok':(st==='FAILED'?'fail':(st==='PROCESSING'?'run':''))) + '</span>' + '<div style="margin-top:3px"><span title="' + recogTip(x['识别状态']) + '" style="cursor:help;font-size:11px">' + chip(recogCn(x['识别状态']), recogTone(x['识别状态'])) + '</span></div>',
              String(x['更新时间']||'').slice(0,16).replace('T',' '),
              (function(){
                var todo = (st === '' || st === 'PENDING' || st === '待处理');
                return '<div style="white-space:nowrap">' + btn(actionTxt, btnCls||'', go, sku) +
                  (todo ? ' ' + btn('去生成 →', '', 'gen-new', sku) : '') + '</div>';
              })()
            ];
          });
        }
        var html = '';
        if (R === '运营'){
          html = stats([
            ['待生成', pending, '排队等生成', '', false],
            ['生成中', processing, '', '', false],
            ['待审核', review, '', 'run', false],
            ['可复制上架', completed, '已通过检查', 'ok', false],
          ], 4) +
          panel('你的完整流程', flow([
            {t:'提交生成', s:'填好商品资料选站点', n:pending, go:'gen-new'},
            {t:'等系统生成', s:'一般 12 分钟内', n:processing, go:'dash-runs'},
            {t:'看待审文案', s:'系统给一套定稿', n:review, tone:'run', go:'rev-list'},
            {t:'复制上架', s:'四段文案复制到亚马逊', n:completed, tone:'ok', go:'rev-list'},
          ]), {sub:'点任意环节直接跳过去处理'}) +
          panel('我的商品（'+skuRows.length+' 条）', pagedTable(['图片','SKU','站点','状态','更新时间',''], rowList(skuRows,'详情'), 20, 'dash-my-sku'), {flush:true});
        } else if (R === '审核'){
          var reviewRows = skuRows.filter(function(x){ return String(x['处理状态']||'').toUpperCase()==='REVIEW_REQUIRED'; });
          html = stats([
            ['待审核', review, '已出检查报告', '', false],
            ['已完成', completed, '', 'ok', false],
            ['失败', failed, '', 'fail', false],
          ], 3) +
          panel('你的完整流程', flow([
            {t:'看待审文案', s:'系统只给一套定稿', n:review, tone:'run', go:'rev-list'},
            {t:'看检查报告', s:'五项检查', n:review, go:'rev-audit'},
            {t:'放行或打回', s:'打回指定字段', n:review, go:'rev-action'},
            {t:'处理疑难', s:'系统修不了的', n:failed, tone:'fail', go:'rev-manual'},
          ]), {sub:'点任意环节直接跳过去处理'}) +
          panel('待审核商品（'+reviewRows.length+' 条）', pagedTable(['图片','SKU','站点','状态','更新时间',''], rowList(reviewRows,'去审核','btn'), 20, 'dash-my-review'), {flush:true});
        } else {
          html = stats([
            ['待生成', pending, '', '', false],
            ['生成中', processing, '', '', false],
            ['待审核', review, '', 'run', false],
            ['已完成', completed, '', 'ok', false],
            ['失败', failed, '', 'fail', false],
          ], 5) +
          panel('运行概览', flow([
            {t:'待生成', s:'排队等生成', n:pending, go:'dash-runs'},
            {t:'生成中', s:'正在跑', n:processing, go:'dash-runs'},
            {t:'待审核', s:'等人工放行', n:review, tone:'run', go:'rev-list'},
            {t:'已完成', s:'可上架', n:completed, tone:'ok', go:'rev-list'},
            {t:'失败', s:'按原因归类重跑', n:failed, tone:'fail', go:'gen-retry'},
          ]), {sub:'点任意环节直接跳过去处理'}) +
          panel('全部任务（'+skuRows.length+' 条）', pagedTable(['图片','SKU','站点','状态','更新时间',''], rowList(skuRows,'详情'), 20, 'dash-all-task'), {flush:true});
        }
        root.innerHTML = html;
      });
    }, 0);
    return el;
  }
});
page('dash-runs', {
  roles:['运营','审核','管理员'],
  guide:[
    '下面几个数字是<b>此刻</b>的运行情况，不是今天累计。',
    '「正在运行」表里能看到每条任务<b>跑到第几步</b>，点「详情」看完整流程图。',
    '下面「今天失败的」已经<b>按原因归好类</b>了——同一个原因的可以一起重跑，不用一条条点。'
  ],
  spec:{
    q:'现在有多少任务在跑、卡在哪一步、有没有异常堆积。',
    acts:['取消任务','进入运行详情','按失败原因批量重跑'],
    wf:['WF-28-00 主编排（只读状态）'],
    reads:['run','job_queue','audit_log'],
    writes:['run.status（仅取消）'],
    limits:['取消只改状态标记，不直接杀 n8n 执行，避免留下半写数据','不在此页改任何生成结果']
  },
  body:function(){
    var el = '<div id="dash-runs-root">' + ghost('正在加载运行情况…') + '</div>';
    setTimeout(function(){
      API.table('SKU_输入表', {}, 200).then(function(r){
        var root = document.getElementById('dash-runs-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['SKU']; });
        /* [fix 09-16al] 排序口径：**新创建/待处理的排最前**（原先新商品的「处理状态」不在已知取值里 → 被判成 5 → 沉到列表最底部，客户反馈"新建的找不到"）。
   分组：0 需人工处理 / 1 新创建·待处理 / 2 生成中 / 3 已完成 / 4 失败 / 5 其他 */
        function statusRank(s){
          var u = String(s||'').toUpperCase().trim();
          if (u === 'REVIEW_REQUIRED') return 0;
          if (u === '' || u === '待处理' || u === '新创建' || u === 'PENDING' || u === 'NEW') return 1;
          if (u === 'PROCESSING') return 2;
          if (u === 'COMPLETED' || u === 'SUCCESS') return 3;
          if (u === 'FAILED') return 4;
          return 5;
        }
        rows.sort(function(a,b){ var ra=statusRank(a['处理状态']), rb=statusRank(b['处理状态']); if(ra!==rb) return ra-rb; return String(b['更新时间']||'').localeCompare(String(a['更新时间']||'')); });
        function cnt(s){ return rows.filter(function(x){ return String(x['处理状态']||'').toUpperCase() === s; }).length; }
        var running = cnt('PROCESSING'), pending = cnt('PENDING'), completed = cnt('COMPLETED'), review = cnt('REVIEW_REQUIRED'), failed = cnt('FAILED');
        function tone(s){ var u = String(s||'').toUpperCase(); return u==='COMPLETED'?'ok':(u==='FAILED'||u==='REVIEW_REQUIRED'?'fail':(u==='PROCESSING'?'run':'')); }
        root.innerHTML =
          stats([
            ['正在运行', running, '', ' ', false],
            ['排队等待', pending, '', '', false],
            ['待审核', review, '', 'warn', false],
            ['已完成', completed, '', 'ok', false],
            ['失败', failed, '', 'fail', false],
          ], 5) +
          panel('全部任务（' + rows.length + ' 条）', pagedTable(
            ['图片','SKU','站点','状态','更新时间',''],
            rows.map(function(x){
              var sku = x['SKU']||'';
              var st = String(x['处理状态']||'').toUpperCase();
              return [
                thumbHtml(x['产品图片URL']),
              '<span class="m">' + sku + '</span>',
                x['目标市场'] || '—',
                chip(x['处理状态']||'', tone(x['处理状态'])),
                '<span class="m">' + String(x['更新时间']||'').slice(0,16).replace('T',' ') + '</span>',
                btn('详情', '', ((st === 'COMPLETED' || st === 'REVIEW_REQUIRED') ? 'rev-detail' : 'sku-detail'), sku)
              ];
            })
          ), {flush:true});
      });
    }, 0);
    return el;
  }
});
page('dash-quality', {
  roles:['审核','管理员'],
  guide:[
    '看「一次通过率」判断系统整体好不好用；<b>目标是 85%</b>。',
    '失败原因表要分清两类：<b>系统的问题</b>（准入、增量）和<b>输入的问题</b>（资料没填全）——后者不该算系统退化。',
    '右边「版本分界线」很重要：<b>换过 AI 指令或模型的那一周，不能和上一周直接比</b>。'
  ],
  spec:{
    q:'这套系统产出的文案质量在往哪个方向走？改了参数/指令/模型有没有让它变好？',
    acts:['切换周期','按类目或站点下钻','导出周报'],
    wf:['WF-28-09 反馈闭环（周）'],
    reads:['run','certificate','listing_final','review_action','param_version','prompt_version','model_profile'],
    writes:['无'],
    limits:['指标必须绑版本：换过指令/模型的周次要在图上标出分界线，否则趋势没有意义']
  },
    body:function(){
    var el = '<div id="dash-quality-root">' + ghost('正在加载质量数据…') + '</div>';
    setTimeout(function(){
      API.table('证书表', {}, 200).then(function(r){
        var root = document.getElementById('dash-quality-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['运行ID']; });
        if (!rows.length){ root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        function isPass(v){ var s = String(v||'').trim().toUpperCase(); return s==='TRUE'||s==='是'||s==='YES'||s==='1'||s==='PASS'; }
        function isFail(v){ var s = String(v||'').trim().toUpperCase(); return s==='FALSE'||s==='否'||s==='NO'||s==='0'||s==='FAIL'; }
        var passed = rows.filter(function(x){ return isPass(x['全部通过']); }).length;
        var failed = rows.filter(function(x){ return isFail(x['全部通过']); }).length;
        var rate = rows.length ? Math.round(passed / rows.length * 1000) / 10 : 0;
        var failedRows = rows.filter(function(x){ return isFail(x['全部通过']); });
        root.innerHTML =
          stats([
            ['一次通过率', rate + '%', '目标 85% 以上', rate >= 85 ? 'ok' : 'warn', false],
            ['已出证书', rows.length + ' 份', '证书表累计', '', false],
            ['全部通过', passed + ' 份', '', 'ok', false],
            ['未通过', failed + ' 份', '', 'fail', false],
          ], 4) +
          panel('未通过明细（全部通过 = 否）', failedRows.length ? pagedTable(
            ['SKU','站点','结论','生成时间',''],
            failedRows.map(function(x){ return [
              '<span class="m">' + (x['SKU']||'—') + '</span>',
              x['目标市场'] || '—',
              chip('未通过','fail'),
              '<span class="m">' + String(x['生成时间']||'').slice(0,16).replace('T',' ') + '</span>',
              btn('查看报告','','rev-audit',(x['SKU']||''))
            ]; })
          ) : callout('ok','全部通过','当前所有证书全部通过，没有失败明细。'), {flush:true});
      });
    }, 0);
    return el;
  }
});
/* ───────── ② 我的商品 ───────── */
page('dash-flow', {
  roles:['运营','审核','管理员'],
  guide:[
    '这一页回答：<b>文案从收到商品到交付，一共要过哪 12 道工序</b>，以及每道工序到现在<b>累计积累了多少数据</b>。',
    '卡片上的大数字是<b>系统启用以来的累计值</b>，不是今天的量--它展示的是这套系统"越用越好"的底子有多厚。',
    '每张卡片都可以点，直接跳到承载这道工序数据的页面。最后还有一条<b>回流段</b>：上线后的真实表现反过来喂给词评级和版本迭代。'
  ],
  spec:{
    q:'整个工作流总共 12 道工序是什么，每道工序累计沉淀了多少条记录。',
    acts:['查看各工序累计数据','点击工序卡片跳转'],
    wf:['WF-28-00 ~ WF-28-07 全链路（只读聚合）'],
    reads:['sku','fact_registry','keyword_raw','opportunity','field_candidate','listing_final','certificate','publication','performance_weekly'],
    writes:['无'],
    limits:[
      '本页<b>只读</b>，不在此页触发任何生成',
      '全部数字为各工序落库记录的<b>累计统计</b>，不允许显示估算值',
      '回流段不属于 12 道工序，是闭环的第四段，单独标出'
    ]
  },
    body:function(){
    var el = '<div id="dash-flow-root">' + ghost('正在加载全流程数据…') + '</div>';
    setTimeout(function(){
      Promise.all([
        API.table('SKU_输入表', {}, 200),
        API.table('商品事实表', {}, 200),
        API.table('站点词库_US', {}, 200),
        API.table('候选台账', {}, 200),
        API.table('证书表', {}, 200),
        API.table('定稿输出表', {}, 200)
      ]).then(function(rs){
        var root = document.getElementById('dash-flow-root');
        if (!root) return;
        for (var i=0;i<rs.length;i++){ if (!rs[i] || !rs[i].ok || !rs[i].data || rs[i].data.success === false){ root.innerHTML = callout('stop','数据加载失败',(rs[i]&&rs[i].data&&rs[i].data.error)||'请检查网络或稍后重试'); return; } }
        function cnt(r, key){ if (r && r.data && r.data.total !== undefined && r.data.total !== null) return r.data.total; var rows = (r && r.data && r.data.data) || []; return rows.filter(function(x){ return x && x[key]; }).length; }
        function fmt(n){ n = Number(n || 0); try { return n.toLocaleString(); } catch(e){ return String(n); } }
        var skuN = cnt(rs[0], 'SKU'), factN = cnt(rs[1], 'SKU'), kwN = cnt(rs[2], '关键词'), ledgerN = cnt(rs[3], '候选ID'), certN = cnt(rs[4], '运行ID'), finN = cnt(rs[5], 'SKU');
        root.innerHTML =
          stats([
            ['商品累计', fmt(skuN), 'SKU_输入表', '', false],
            ['关键词累计', fmt(kwN), '站点词库_US', 'ok', false],
            ['候选词累计', fmt(ledgerN), '候选台账', '', false],
            ['定稿累计', fmt(finN), '定稿输出表', 'ok', false],
          ], 4) +
          panel('① 资料与识别段（工序 1-2）', flow([
          {t:'商品事实表录入', s:'SKU_输入表 · ' + fmt(skuN) + ' 条', go:'sku-detail'},
          {t:'Product DNA 识别', s:'商品事实表 · ' + fmt(factN) + ' 条', go:'sku-dna'}
        ]), {flush:true, strong:true}) +
        panel('② 数据摄取与机会发现段（工序 3-6）', flow([
          {t:'卖家精灵全表', s:'站点词库_US · ' + fmt(kwN) + ' 行', go:'data-kw'},
          {t:'12 类分类', s:'机会清单 · ' + fmt(ledgerN) + ' 条', go:'data-opp'},
          {t:'PPC/SQP 归因', s:'候选台账 · ' + fmt(ledgerN) + ' 条', go:'data-ppc'},
          {t:'Reverse ASIN 入口簇', s:'候选台账 · ' + fmt(ledgerN) + ' 条', go:'data-aba'}
        ]), {flush:true, strong:true}) +
        panel('③ 生成与审核段（工序 7-12）', flow([
          {t:'字段路由准入', s:'候选台账 · ' + fmt(ledgerN) + ' 条', go:'rev-ledger'},
          {t:'四层入口组合', s:'候选台账 · ' + fmt(ledgerN) + ' 条', go:'rev-ledger'},
          {t:'仲裁顺序', s:'候选台账 · ' + fmt(ledgerN) + ' 条', go:'rev-ledger'},
          {t:'八项质量门禁', s:'证书表 · ' + fmt(certN) + ' 份', go:'rev-audit'},
          {t:'审核放行', s:'定稿输出表 · ' + fmt(finN) + ' 套', go:'rev-list'},
          {t:'上架记录', s:'上线跟踪', go:'fb-publish'}
        ]), {flush:true, strong:true}) +
        panel('↻ 回流段（持续迭代）', flow([
          {t:'ASIN 登记', s:'周表现 → 词升降级 → 版本迭代', go:'fb-publish'}
        ]), {flush:true, strong:true, note:'这就是系统「越用越好」的底子：<b>每一次生成都往这些工序里沉淀记录</b>，数据越多，词评级、意图标注和参数版本越准。'});
      });
    }, 0);
    return el;
  }
});
page('sku-list', {
  roles:['运营','审核','管理员'],
  guide:[
    '想生成文案，得先把这个商品的<b>资料填完整</b>（带红星的空全填上），资料不全就点不了生成。',
    '同一个图案的<b>四季款和圣诞款要当成两个商品分别建</b>，别混在一起，不然系统会把「防水」「户外」这些词写到不该写的款式上。',
    '资料填齐后，点右上角「新建商品」加商品，再去「新建生成任务」提交生成。'
  ],
  spec:{
    q:'我有哪些商品，各自的资料齐不齐、生成到什么状态。',
    acts:['新建商品','批量导入','筛选','进入详情','提交生成'],
    wf:['无'],
    reads:['sku','product_family','fact_registry（聚合计数）','run（最近一次）'],
    writes:['无'],
    limits:['本页只看不改，改资料进 2.2']
  },
  body:function(){
    var html = toolbar(
      ['<input class="inp" id="sku-search" placeholder="搜索 SKU">', sel('全部状态',['待处理','生成中','待审核','需人工','已上架'])],
      ['<button class="btn" id="sku-search-btn">搜索</button>', btn('批量导入','','','','','批量导入功能暂未开放'), btn('新建商品','btn','sku-detail')]
    ) + '<div id="sku-data" style="margin-top:14px">' + ghost('正在加载商品列表…') + '</div>';
    setTimeout(function(){
      API.skus({}).then(function(r){
        var el = document.getElementById('sku-data');
        if (!el) return;
        var rows = (r.ok && r.data && r.data.data) ? r.data.data : [];
        rows = rows.filter(function(x){ return x['记录ID']; });
        /* [fix 09-16al] 排序口径：**新创建/待处理的排最前**（原先新商品的「处理状态」不在已知取值里 → 被判成 5 → 沉到列表最底部，客户反馈"新建的找不到"）。
   分组：0 需人工处理 / 1 新创建·待处理 / 2 生成中 / 3 已完成 / 4 失败 / 5 其他 */
        function statusRank(s){
          var u = String(s||'').toUpperCase().trim();
          if (u === 'REVIEW_REQUIRED') return 0;
          if (u === '' || u === '待处理' || u === '新创建' || u === 'PENDING' || u === 'NEW') return 1;
          if (u === 'PROCESSING') return 2;
          if (u === 'COMPLETED' || u === 'SUCCESS') return 3;
          if (u === 'FAILED') return 4;
          return 5;
        }
        rows.sort(function(a,b){ var ra=statusRank(a['处理状态']), rb=statusRank(b['处理状态']); if(ra!==rb) return ra-rb; return String(b['更新时间']||'').localeCompare(String(a['更新时间']||'')); });
        if (!rows.length){ el.innerHTML = callout('warn','还没有商品','点「新建商品」添加第一个 SKU。'); return; }
        var toneOf = function(st){
          if (st==='COMPLETED'||st==='completed') return 'ok';
          if (st==='pending'||st==='待处理') return 'neutral';
          if (st==='failed'||st==='失败') return 'fail';
          return 'run';
        };
        function thumbHtml(url){
          if (!url) return '<span style="color:var(--t-3)">—</span>';
          if (url.indexOf('http') === 0) return '<img src="'+url+'" style="width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb">';
          return '<span style="font-size:11px;color:var(--t-3)">本地图</span>';
        }
        function renderList(list){
          var tr = list.map(function(x){
          return [
            thumbHtml(x['产品图片URL']),
            '<span class="m">'+(x.SKU||'—')+'</span>',
            '<span class="m">'+(x['产品族ID']||'—')+'</span>',
            x['类目']||'—',
            x['季节范围']||'—',
            x['目标市场']||'—',
            '<span title="' + statusTip(x['处理状态']) + '" style="cursor:help">' + chip(statusCn(x['处理状态']), toneOf(x['处理状态'])) + '</span>' + '<div style="margin-top:3px"><span title="' + recogTip(x['识别状态']) + '" style="cursor:help;font-size:11px">' + chip(recogCn(x['识别状态']), recogTone(x['识别状态'])) + '</span></div>',
            (x['处理时间']||'—').slice(0,10),
            (function(){
              var st = String(x['处理状态']||'').toUpperCase();
              var todo = (st === '' || st === 'PENDING' || st === '待处理');
              // [fix 09-16aq] 待生成的行给一个直达按钮，一眼知道下一步点哪（客户反馈：只看到 PENDING 不知道要干嘛）
              return '<div style="white-space:nowrap">' + btn('详情', '', 'sku-dna', (x.SKU||'')) +
                (todo ? ' ' + btn('去生成 →', '', 'gen-new', (x.SKU||'')) : '') + '</div>';
            })()
          ];
        });
          el.innerHTML = pagedTable(['图片','SKU','产品族','类目','季节范围','市场','状态','处理时间',''], tr, 20, 'sku-list-all');
        }
        renderList(rows);
        var searchBtn = document.getElementById('sku-search-btn');
        if (searchBtn) searchBtn.onclick = function(){
          var q = (document.getElementById('sku-search')||{}).value || '';
          var filtered = q ? rows.filter(function(x){ return String(x.SKU||'').toLowerCase().indexOf(q.toLowerCase()) >= 0; }) : rows;
          renderList(filtered);
        };
      });
    }, 0);
    return html;
  }
});
page('sku-detail', {
  roles:['运营','审核','管理员'],
  guide:[
    '<b>带红星的是必填</b>，少一项就生成不了。',
    '<b>不确定的就留空</b>，不要猜着填。留空系统会停下来问你；猜错了会让整套文案说错话。',
    '「不能说的话」写进去之后<b>不可撤销</b>——写了 waterproof，后面任何环节都不会再用这个词。',
    '资料齐了直接点「保存并生成文案」。'
  ],
  spec:{
    q:'这个商品的真实情况是什么？哪些是确认的、哪些是推断的、哪些还不知道。',
    acts:['编辑资料','留空表示不确定','登记不能说的话','上传商品图','保存并生成'],
    wf:['提交生成 → WF-28-00'],
    reads:['sku','fact_registry','product_family','forbidden_token'],
    writes:['sku','fact_registry','audit_log'],
    limits:[
      '不确定的项不得被猜测填补——留空即阻断，不允许「先填个大概」',
      'AI 与系统都<b>禁止</b>写本表（PRD §1.2 权限矩阵）',
      '「不能说的话」写入后进禁用注册表，<b>不可逆</b>'
    ]
  },
    body:function(){
    function pageParam(){
      var h = (location.hash || '').replace(/^#/, '');
      var idx = h.indexOf('?');
      if (idx >= 0){
        var q = h.slice(idx + 1);
        var ps = q.split('&');
        for (var i=0;i<ps.length;i++){ var kvp = ps[i].split('='); if (kvp[0] === 'sku') return decodeURIComponent((kvp[1]||'').replace(/\+/g, ' ')); }
        return '';
      }
      idx = h.indexOf('/');
      return idx >= 0 ? decodeURIComponent(h.slice(idx + 1)) : '';
    }
    function toneOf(st){ var s = String(st||'').toUpperCase(); if (s==='COMPLETED') return 'ok'; if (s==='FAILED') return 'fail'; if (s==='PROCESSING') return 'run'; if (s==='REVIEW_REQUIRED') return 'warn'; return 'neutral'; }
    function tplBarHtml(){
      // [二期需求1] 商品模板条：一键填充常用属性，免「每个属性都去点一遍」
      // [fix 2026-09-18] 原来控件行与提示只隔 6px、全挤在一行里 → 分三段：控件行 / 虚线分隔 / 提示，留足呼吸空间
      return '<div class="card" style="margin-bottom:14px;padding:14px 16px">' +
        '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;row-gap:10px">' +
        '<b style="font-size:13px;white-space:nowrap;margin-right:2px">商品模板</b>' +
        '<select id="tpl-select" class="ctl" style="width:250px"><option value="">（选择模板一键填充）</option></select>' +
        '<button class="btn" id="tpl-apply" type="button" style="background:var(--g-600);color:#fff;border:none;font-weight:600">用模板填充</button>' +
        '<button class="btn btn--ghost" id="tpl-save" type="button">另存为模板</button>' +
        '<button class="btn btn--ghost" id="tpl-del" type="button">删除模板</button>' +
        '</div>' +
        '<div id="tpl-hint" class="hint" style="font-size:11.5px;color:var(--t-3);margin-top:12px;padding-top:10px;border-top:1px dashed #E8ECEA;line-height:1.75">' +
        '把经常重复的属性存成模板，下次一键填好。<b>模板不记 SKU 编号、产品图片、父体ID</b>（这三项每个商品都不同，填充时不会覆盖）。' +
        '</div></div>';
    }
    function skuFormHtml(){
      return '<div class="form g2">' +
        fld('父体', '<select id="nsku-family" class="ctl" onchange="onSkuFamilyChange()"><option>无（独立商品）</option></select>', '归入已有父体，可选；勾选多个尺寸时会各建一个商品，填同一个父体ID即可归入同一父体') +
fld('SKU 编号 <span style="color:var(--red)">*</span>', '<input id="nsku-sku" class="ctl" placeholder="如 PILLOW-FLORAL-18X18">', '商品唯一编号，保存时会自动检查是否重复') +
        fld('商品是什么（英文核心词）<span style="color:var(--red)">*</span>', '<input id="nsku-entity" class="ctl" placeholder="如 pillow covers">', '写进标题的第一个词，比如 pillow covers') +
        fld('尺寸 <span style="color:var(--red)">*</span>（可多选）', '<div id="nsku-dims" class="ctl" style="display:flex;flex-wrap:wrap;gap:2px;height:auto;min-height:34px;align-items:center">' + sizeCheckboxesHtml('US') + '</div>', '<span id="nsku-size-note">勾选 1 个 = 建 1 个商品；勾选多个 = <b>每个尺寸各建一个商品</b>（SKU 自动加尺寸后缀，如 -18X18）。归入父体后会自动收敛为该父体的计划尺寸。</span>') +
        fld('数量 <span style="color:var(--red)">*</span>', '<input id="nsku-quantity" class="ctl" placeholder="如 set of 2">', '一套几个，比如 set of 2') +
        fld('类目', '<select id="nsku-category" class="ctl"><option value="Home & Kitchen > Home Décor > Decorative Pillows">抱枕（Decorative Pillows）</option><option value="Kitchen & Dining > Table Runners">桌旗（Table Runners）</option><option value="Nursery > Crib Sheets">婴童床笠（Crib Sheets）</option></select>') +
        fld('季节范围', '<select id="nsku-season" class="ctl"><option value="ALL_SEASON">四季通用</option><option value="SPRING_SUMMER">春夏</option><option value="AUTUMN_WINTER">秋冬</option><option value="CHRISTMAS">圣诞节</option><option value="THANKSGIVING">感恩节</option></select>') +
        fld('目标市场', '<select id="nsku-market" class="ctl" onchange="refreshSizeChoices(this.value)"><option>US</option><option>GB</option><option>DE</option><option>FR</option><option>IT</option><option>ES</option><option>CA</option></select>', '切换站点会同步切换尺寸单位（美国/加拿大/英国=inch，欧洲四国=cm）') +
        fld('品牌名', '<input id="nsku-brand" class="ctl" placeholder="如 HomGoodz">') +
        fld('产品图片', '<div style="display:flex;gap:8px;align-items:center"><input id="nsku-image" class="ctl" placeholder="上传后自动填共享地址" style="flex:1"><button class="btn" id="nsku-upload-btn" type="button" style="white-space:nowrap">上传图片</button></div><input type="file" id="nsku-file" accept="image/*" style="display:none"><img id="nsku-thumb" style="display:none;margin-top:8px;max-width:160px;max-height:160px;border-radius:8px;border:1px solid #e5e7eb"><div id="nsku-upload-progress" style="margin-top:6px;font-size:12px;color:var(--g-500)"></div>') +
        fld('材质（可选）', '<input id="nsku-material" class="ctl" placeholder="如 faux linen">') +
        fld('工艺（可选）', '<input id="nsku-craft" class="ctl" placeholder="如 printed pattern, floral">') +
        fld('结构（可选）', '<input id="nsku-structure" class="ctl" placeholder="如 hidden zipper">') +
        fld('卖点功能（可选）', '<input id="nsku-function" class="ctl" placeholder="如 waterproof, decorative">', '有就填，这是主要卖点；没有就留空') +
        fld('包含物（可选）', '<input id="nsku-inclusion" class="ctl" placeholder="如 covers only, inserts not included">') +
        fld('护理（可选）', '<input id="nsku-care" class="ctl" placeholder="如 machine washable">') +
        fld('认证安全（可选）', '<input id="nsku-certification" class="ctl" placeholder="如 OEKO-TEX">') +
        fld('禁止声明（可选）', '<input id="nsku-prohibited" class="ctl" placeholder="如 waterproof（不想让系统说的词）">') +
        '</div>';
    }
    function loadSeasons(selId, keepVal){
      API.table('季节配置', {}, 50).then(function(r){
        var rows = (r.ok && r.data && r.data.data) ? r.data.data.filter(function(x){ return x && x['季节代码'] && x['启用'] !== false; }) : [];
        if (!rows.length) return;
        if (!window._SEASON_NAME2CODE) window._SEASON_NAME2CODE = {};
        rows.forEach(function(x){ window._SEASON_NAME2CODE[x['季节名称']] = x['季节代码']; });
        var sel = document.getElementById(selId);
        if (!sel) return;
        var cur = keepVal || sel.value;
        sel.innerHTML = rows.map(function(x){
          return '<option value="'+x['季节代码']+'">'+x['季节名称']+'</option>';
        }).join('');
        if (cur){ var found = rows.some(function(x){ return x['季节代码'] === cur; }); if (found) sel.value = cur; }
        var kwBox = document.getElementById('gen-kw-seasons');
        if (kwBox) kwBox.innerHTML = rows.map(function(x){ return '<label style="display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:normal"><input type="checkbox" value="'+x['季节代码']+'" style="width:auto"> '+x['季节名称']+'</label>'; }).join('');
      });
    }
    function submitNewSku(){
      function val(id){ return (document.getElementById(id)||{}).value || ''; }
      var required = [['nsku-sku','SKU 编号'],['nsku-entity','商品是什么'],['nsku-quantity','数量']];
      var missing = required.filter(function(x){ return !val(x[0]); });
      if (missing.length > 0){ toast('还缺必填项：' + missing.map(function(x){return x[1];}).join('、')); return; }
      // [fix 09-16e] 2.3 尺寸改多选（二期 PRD §14）：勾选 1 个建 1 个商品；勾选多个则每个尺寸各建一个商品，
      // 多尺寸时 SKU 自动加尺寸后缀，便于用同一个「父体ID」归入同一父体。
      var dims = checkedVals('nsku-dims');
      if (!dims.length){ toast('还缺必填项：尺寸（至少勾选一个）'); return; }
      var sku = val('nsku-sku');
      var multi = dims.length > 1;
      var targets = dims.map(function(d){ return { size: d, sku: multi ? (sku + '-' + sizeTag(d)) : sku }; });
      API.table('SKU_输入表', {SKU: sku}, 200).then(function(r){
        var rows = (r.ok && r.data && r.data.data) ? r.data.data : [];
        var existed = targets.filter(function(t){ return rows.some(function(x){ return x['SKU'] === t.sku; }); });
        if (existed.length){ toast('已存在，请换编号：' + existed.map(function(t){ return t.sku; }).join('、')); return; }
        function baseBody(){
          return {
            marketplace: val('nsku-market') || 'US',
            category: val('nsku-category'), season_scope: val('nsku-season'),
            family_id: val('nsku-family'),
            brand_name: val('nsku-brand'), product_image_url: val('nsku-image'),
            product_entity: val('nsku-entity'),
            quantity: val('nsku-quantity'), material: val('nsku-material'),
            craft: val('nsku-craft'), structure: val('nsku-structure'),
            function: val('nsku-function'), inclusion: val('nsku-inclusion'),
            care: val('nsku-care'), certification: val('nsku-certification'),
            prohibited_claims: val('nsku-prohibited')
          };
        }
        var created = 0, failed = [];
        function step(k){
          if (k >= targets.length){
            if (failed.length){
              toast('已保存 ' + created + ' 个，失败 ' + failed.length + ' 个：' + failed.join('；'));
            } else {
              toast(multi ? ('已保存 ' + created + ' 个商品（按尺寸各一个），可去「新建生成任务」生成文案')
                          : ('已保存商品 ' + targets[0].sku + '，可去「新建生成任务」生成文案'));
              var gg = document.getElementById('go-gen-btn'); if (gg){ gg.style.display = 'inline-block'; gg.onclick = function(){ location.hash = 'gen-new'; }; }
            }
            ['nsku-sku','nsku-entity','nsku-quantity','nsku-brand','nsku-image','nsku-material','nsku-craft','nsku-structure','nsku-function','nsku-inclusion','nsku-care','nsku-certification','nsku-prohibited'].forEach(function(id){ var e = document.getElementById(id); if (e) e.value = ''; });
            resetCheckboxes('nsku-dims');
            var pr = document.getElementById('nsku-upload-progress'); if (pr) pr.textContent = '';
            /* [fix 09-16ak] 创建成功 → 自动重载本页，让新商品/父体成员数立刻反映出来（客户反馈）。
               但**不打断用户**：若 2.5 秒内已开始录入下一个商品（SKU 框又有内容），就跳过本次刷新。 */
            setTimeout(function(){
              var nx = document.getElementById('nsku-sku');
              if (nx && String(nx.value || '').trim()) return;
              if (typeof render === 'function') render();
            }, 2500);
            return;
          }
          var body = baseBody();
          body.sku = targets[k].sku;
          body.dimensions = targets[k].size;
          API.create(body).then(function(r2){
            if (r2.ok && r2.data && r2.data.success){ created++; }
            else { failed.push(targets[k].sku + '（' + ((r2.data && r2.data.error) || '网络异常').slice(0,40) + '）'); }
            step(k + 1);
          });
        }
        step(0);
      });
    }
    function bindSkuUpload(){
      setTimeout(function(){
        var upBtn = document.getElementById('nsku-upload-btn');
        var fileIn = document.getElementById('nsku-file');
        if (upBtn && fileIn){
          upBtn.onclick = function(){ fileIn.click(); };
          fileIn.onchange = function(){
            var f = fileIn.files && fileIn.files[0];
            if (!f) return;
            var prog = document.getElementById('nsku-upload-progress');
            if (prog) prog.textContent = '上传中：' + f.name + ' …';
            var rd = new FileReader();
            rd.onload = function(){
              var b64 = String(rd.result).split(',')[1];
              API.uploadImage({ base64: b64, name: f.name, mimeType: f.type || 'image/jpeg' }).then(function(r){
                if (r && r.ok && r.data && r.data.success){
                  var img = document.getElementById('nsku-image');
                  if (img) img.value = r.data.mediaUrl || r.data.driveUrl || '';
                  var thumb = document.getElementById('nsku-thumb'); if (thumb){ thumb.src = rd.result; thumb.style.display = 'block'; }
                  if (prog) prog.textContent = '上传成功，已自动填写共享地址';
                } else {
                  if (prog) prog.textContent = '上传失败：' + ((r&&r.data&&r.data.error)||'请重试');
                }
              });
            };
            rd.readAsDataURL(f);
          };
        }
      }, 300);
    }
    function showGoGenBtn(){
      var old = document.getElementById('go-gen-fab');
      if (old){ old.style.display = 'block'; return; }
      var fab = document.createElement('button');
      fab.id = 'go-gen-fab';
      fab.textContent = '去生成文案 →';
      fab.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:9999;background:var(--g-600);color:#fff;border:none;border-radius:24px;padding:14px 24px;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.25);transition:transform .15s';
      fab.onmouseenter = function(){ fab.style.transform = 'translateY(-2px)'; };
      fab.onmouseleave = function(){ fab.style.transform = 'none'; };
      fab.onclick = function(){ fab.remove(); location.hash = 'gen-new'; };
      document.body.appendChild(fab);
    }
    var skuParam = window.CUR_SKU || pageParam();
    var _tplNeedInit = !window.CUR_SKU && !pageParam();
    var formPart = '';
    if (!skuParam){
      formPart = tplBarHtml() + panel('新增商品（保存后即可去「新建生成任务」生成文案）', skuFormHtml() + '<div style="margin-top:12px"><button class="btn" id="sku-save-btn" style="background:var(--g-600);color:#fff;border:none;font-weight:600">保存商品</button><button class="btn" id="go-gen-btn" style="display:none;margin-left:8px">去生成文案</button></div>');
    }
    var el = formPart + '<div id="sku-detail-root">' + ghost('正在加载商品资料…') + '</div>';
    setTimeout(function(){
    if (_tplNeedInit) tplInit();   // [二期需求1] 初始化模板下拉
      if (!skuParam){
        var saveBtn = document.getElementById('sku-save-btn'); if (saveBtn) saveBtn.onclick = submitNewSku;
        bindSkuUpload();
        loadSeasons('nsku-season', '');
        API.table('产品族', {}, 200).then(function(r){
          var famRows = (r.ok && r.data && r.data.data) ? r.data.data : [];
          var famSel = document.getElementById('nsku-family');
          if (famSel && famRows.length){
            window.FAM_CACHE = famRows;   // [fix 09-16ao] 供 onSkuFamilyChange 读取该父体的计划尺寸
            var ids = famRows.map(function(x){ return x['family_id'] || x['产品族ID'] || ''; }).filter(function(v){ return v; });
            famSel.innerHTML = '<option>无（独立商品）</option>' + ids.map(function(id){ return '<option value="'+id+'">'+id+'</option>'; }).join('');
          }
        });
      }
      var sku = skuParam;
      Promise.all([
        API.table('SKU_输入表', sku ? {SKU: sku} : {}, 1),
        API.table('商品事实表', sku ? {SKU: sku} : {}, 1)
      ]).then(function(rs){
        var root = document.getElementById('sku-detail-root');
        if (!root) return;
        for (var i=0;i<rs.length;i++){ if (!rs[i] || !rs[i].ok || !rs[i].data || rs[i].data.success === false){ root.innerHTML = callout('stop','数据加载失败',(rs[i]&&rs[i].data&&rs[i].data.error)||'请检查网络或稍后重试'); return; } }
        var input = ((rs[0].data.data||[]).filter(function(x){ return x && x['SKU']; }))[0];
        var fact = ((rs[1].data.data||[]).filter(function(x){ return x && x['SKU']; }))[0];
        if (!input && !fact){ root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        var skuName = (input && input['SKU']) || (fact && fact['SKU']) || '—';
        var leftPairs = input ? [
          ['SKU', input['SKU']||'—'],
          ['父体ID', input['产品族ID']||'—'],
          ['目标市场', input['目标市场']||'—'],
          ['类目', input['类目']||'—'],
          ['季节范围', input['季节范围']||'—'],
          ['品牌名', input['品牌名']||'—'],
          ['所属类目', input['所属类目']||'—'],
          ['处理状态', chip(input['处理状态']||'待处理', toneOf(input['处理状态']))],
          ['处理时间', bjTime(input['处理时间'])],
          ['运行ID', input['运行ID']||'—'],
        ] : [];
        var imgHtml = (input && input['产品图片URL']) ? (input['产品图片URL'].indexOf('http') === 0 ? '<img src="'+input['产品图片URL']+'" style="width:160px;height:160px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:12px">' : '<div style="font-size:12px;color:var(--t-3);margin-bottom:12px">本地图片（尚未上传到云端）</div>') : '';
        function factCn(a){ var m={'product_entity':'产品实体','dimensions':'尺寸','quantity':'数量','material':'材质','craft':'工艺','structure':'结构','function':'功能','inclusion':'包含物','care':'护理','certification':'认证安全'}; return String(a||'').split(',').map(function(s){ return m[s.trim()] || s.trim(); }).filter(Boolean).join('、'); }
        var factPairs = fact ? [
          ['产品实体', fact['产品实体']||'—'],
          ['尺寸', fact['尺寸']||'—'],
          ['数量', fact['数量']||'—'],
          ['材质', fact['材质']||'—'],
          ['工艺', fact['工艺']||'—'],
          ['结构', fact['结构']||'—'],
          ['功能', fact['功能']||'—'],
          ['包含物', fact['包含物']||'—'],
          ['护理', fact['护理']||'—'],
          ['认证安全', fact['认证安全']||'—'],
          ['禁止声明', fact['禁止声明']||'—'],
          ['数据完整性', fact['数据完整性']||'—'],
        ] : [];
        root.innerHTML =
          '<div class="cols c21">' +
          panel('商品资料 · ' + skuName, imgHtml + (leftPairs.length ? kv(leftPairs) : callout('warn','暂无资料','该 SKU 还没有输入资料。'))) +
          panel('商品事实（Product Truth）', (factPairs.length ? kv(factPairs) : callout('warn','暂无事实','该 SKU 还没有商品事实记录。')) + (fact && fact['缺失字段清单'] ? '<div style="margin-top:12px">' + callout('warn','缺失字段', factCn(fact['缺失字段清单'])) + '</div>' : '')) +
          '</div>';
      });
    }, 0);
    return el;
  }
});
page('sku-family', {
  roles:['运营','管理员'],
  guide:[
    '同一父体下的商品<b>共享图案、材质、风格</b>，各自<b>独享尺寸、数量</b>。',
    '点每行的「生成文案」= 一次提交该父体下所有商品（可按站点挑）：系统只做一套共享内容，其他尺寸自动共用；点每个商品后面的「重生成标题」= 只重做这一个尺寸的标题和亮点。',
    '不要为了让文案看起来不一样，就去改主图案或主风格——<b>每个商品写到最好就行，相似是允许的</b>。',
    '注意「季节混装」告警：同图案的四季款和圣诞款建在一个父体里，容易串词。'
  ],
  spec:{
    q:'哪些商品属于同一父体？共享什么、各自独享什么。',
    acts:['建父体','移入/移出','看父体内差异'],
    wf:['无'],
    reads:['product_family','sku','fact_registry'],
    writes:['product_family','sku.product_family_id'],
    limits:[
      '禁止为制造差异改主风格 / 主节日 / 主图案（F4.10 Family Router）',
      '同一父体下不同尺寸的文案<b>允许高度相似</b>，单个商品最优优先',
      '父体只保证同款不串，<b>不保证季节不串</b>——季节靠「季节款式」字段'
    ]
  },
    body:function(){
    function toneOf(st){ var s = String(st||'').toUpperCase(); if (s==='COMPLETED') return 'ok'; if (s==='FAILED') return 'fail'; if (s==='PROCESSING') return 'run'; if (s==='REVIEW_REQUIRED') return 'warn'; return 'neutral'; }
    function openNewFamilyModal(){
      var html = '<div class="form g2">' +
        fld('父体编号（父体ID）<span style="color:var(--red)">*</span>', '<input id="nfam-id" class="ctl" placeholder="如 FLORAL-SERIES-01">', '这个父体的唯一编号，新增商品时用它来归入') +
        fld('共享图案', '<input id="nfam-pattern" class="ctl" placeholder="如 floral print">') +
        fld('共享材质', '<input id="nfam-material" class="ctl" placeholder="如 faux linen">') +
        fld('共享风格', '<input id="nfam-style" class="ctl" placeholder="如 modern farmhouse">') +
        fld('站点', '<select id="nfam-market" class="ctl" onchange="refreshFamSizeChoices(this.value)">' + (typeof MARKETS_ALL !== 'undefined' ? MARKETS_ALL : ['US','CA','GB','DE','FR','IT','ES']).map(function(m){ return '<option>'+m+'</option>'; }).join('') + '</select>', '这个父体属于哪个站点（父体是按站点的）。下面的尺寸选项按该站点单位显示：US/CA/GB 用 inch，德法意西用 cm。') +
        '<div style="grid-column:1 / -1">' + fld('子体尺寸（可多选）', '<div id="nfam-sizes" style="display:flex;flex-wrap:wrap;gap:2px;padding:6px 0">' + sizeCheckboxesHtml() + '</div>', '一个父体下常含多个尺寸。勾选后这些尺寸作为该父体的子体尺寸集合；去「商品资料填写」建商品时按尺寸各建一个即可。') + '</div>' +
        '</div>';
      openModal('新增父体（先建父体，再去「商品资料填写」把商品归入）', html, function(close){
        var fid = (document.getElementById('nfam-id')||{}).value || '';
        if (!fid){ toast('请填写父体编号'); return; }
        API.createFamily({ family_id: fid, shared_pattern: (document.getElementById('nfam-pattern')||{}).value || '', shared_material: (document.getElementById('nfam-material')||{}).value || '', shared_style: (document.getElementById('nfam-style')||{}).value || '', sizes: checkedVals('nfam-sizes'), marketplace: ((document.getElementById('nfam-market')||{}).value || 'US') }).then(function(r){
          if (r.ok && r.data && r.data.success){
            toast('父体 ' + fid + ' 已创建，页面已刷新');
            close();
            // [fix 09-16ak] 创建成功 → 自动重载本页，让新父体立刻出现在下方列表里（客户反馈）
            setTimeout(function(){ if (typeof render === 'function') render(); }, 350);
          }
          else { toast('创建失败：' + ((r.data && r.data.error) || '请检查网络')); }
        });
      }, '创建');
    }
    var el = toolbar([], ['<button class="btn" id="fam-new-btn" style="background:var(--g-600);color:#fff;border:none;font-weight:600">新增父体</button>']) + '<div id="sku-family-root">' + ghost('正在加载父体数据…') + '</div>';
    setTimeout(function(){
      var nb = document.getElementById('fam-new-btn'); if (nb) nb.onclick = openNewFamilyModal;
      Promise.all([API.table('产品族', {}, 200), API.table('SKU_输入表', {}, 200)]).then(function(rs){
        var root = document.getElementById('sku-family-root');
        if (!root) return;
        for (var i=0;i<rs.length;i++){ if (!rs[i] || !rs[i].ok || !rs[i].data || rs[i].data.success === false){ root.innerHTML = callout('stop','数据加载失败',(rs[i]&&rs[i].data&&rs[i].data.error)||'请检查网络或稍后重试'); return; } }
        var famRows = (rs[0].data.data || []);
        // [fix 09-16al] 新创建的父体排最上面（原来无排序，新建的要看运气才找得到）
        famRows.sort(function(a, b){ return String(b.created_at || b['创建时间'] || '').localeCompare(String(a.created_at || a['创建时间'] || '')); });
        var rows = (rs[1].data.data || []).filter(function(x){ return x && x['SKU']; });
        if (!rows.length && !famRows.length){ root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
                var byFamily = {};
        rows.forEach(function(x){ var fid = x['产品族ID'] || ''; if (!byFamily[fid]) byFamily[fid] = []; byFamily[fid].push(x); });
        var famList = famRows.map(function(f){
          var fid = f.family_id || '';
          return { fid: fid, market: (f['站点'] || f.marketplace || ''), pattern: f.shared_pattern, material: f.shared_material, style: f.shared_style, sizes: (f.sizes || []), members: byFamily[fid] || [] };
        });
        var famIdSet = {};
        famRows.forEach(function(f){ if (f.family_id) famIdSet[f.family_id] = true; });
        var orphan = [];
        Object.keys(byFamily).forEach(function(fid){ if (!fid || !famIdSet[fid]){ orphan = orphan.concat(byFamily[fid]); } });
        function renderMembers(fam){
          var t = '父体 ' + fam.fid + ' 下的商品（' + fam.members.length + ' 个）';
          if (!fam.members.length){ return panel(t, callout('warn','这个父体下还没有商品','去「商品资料填写」新增商品时，把「父体ID」填成 ' + fam.fid + ' 即可归入这个父体。'), {flush:true}); }
          return panel(t, table(
            ['图片','SKU','目标市场','类目','季节范围','处理状态',''],
            fam.members.map(function(m){ return [
              thumbHtml(m['产品图片URL']),
            '<span class="m">' + (m['SKU']||'—') + '</span>',
              m['目标市场']||'—',
              m['类目']||'—',
              m['季节范围']||'—',
              chip(m['处理状态']||'待处理', toneOf(m['处理状态'])),
              '<div style="white-space:nowrap">' + btn('详情', '', 'sku-dna', (m['SKU']||'')) + ' ' +
                '<button class="btn btn--ghost" data-regen="'+encodeURIComponent(m['SKU']||'')+'">重生成标题</button>' +
              '</div>'
            ]; })
          ), {flush:true});
        }
        /* [fix 09-16ao] 方案3：把父体尺寸显示成「计划 vs 已建」对照 —— ✅ 已建该尺寸、⬜ 还没建、⚠️ 计划外尺寸 */
        function _planCell(f){
          var planned = f.sizes || [];
          var have = {}, extra = [];
          f.members.forEach(function(m){ var s = String(m['尺寸'] || ''); if (s) have[s] = true; });
          Object.keys(have).forEach(function(s){ if (planned.indexOf(s) < 0) extra.push(s); });
          if (!planned.length && !extra.length) return '—';
          var html = planned.map(function(s){
            return '<span style="white-space:nowrap;margin-right:7px">' + s + (have[s] ? ' <b style="color:var(--g-600)">✅</b>' : ' <span style="color:#B0B8B4">⬜</span>') + '</span>';
          }).join('');
          if (!planned.length) html = '<span style="color:#8A9390">未填计划</span>';
          if (extra.length) html += '<div style="color:#C0392B;font-size:11.5px;margin-top:3px">⚠️ 计划外尺寸：' + extra.join(' / ') + '</div>';
          return html;
        }
        var famListHtml = famList.length ? table(['父体编号','站点','共享图案','共享材质','共享风格','子体尺寸（✅已建 / ⬜未建）','商品数',''],
            famList.map(function(f, i){ return [
              '<span class="m">' + f.fid + '</span>',
              (f.market ? '<b>' + f.market + '</b>' + (f.market === 'ALL' ? '<div style="font-size:11px;color:#8A9390">多站点</div>' : '') : '<span style="color:#C0392B">未填</span>'),
              f.pattern || '—',
              f.material || '—',
              f.style || '—',
              _planCell(f),
              '<b>' + f.members.length + '</b>',
              '<div style="white-space:nowrap">' +
                '<button class="btn" data-genfam="'+encodeURIComponent(f.fid)+'" style="background:var(--g-600);color:#fff;border:none;font-weight:600">生成文案</button> ' +
                '<button class="btn btn--ghost" data-famx="'+i+'">展开看商品</button>' +
              '</div>'
            ]; })
          ) : callout('warn','还没有父体','点右上角「新增父体」创建第一个父体。');
        var html = panel('父体清单（共 ' + famList.length + ' 个）', famListHtml, {flush:true, note:'同一父体共享图案/材质/风格，各自独享尺寸/数量。<b>点「生成文案」一次提交该父体下所有商品</b>：系统先做出一套共享内容（识别结果、五点、后台搜索词），其他尺寸自动共用，只各写自己的标题和亮点；<b>点「重生成标题」</b>只重做某一个尺寸的标题和亮点，共享内容不动。'});
        if (orphan.length){
          html += panel('未归入父体的商品（共 ' + orphan.length + ' 个）', table(['图片','SKU','目标市场','类目','季节范围','处理状态',''], orphan.map(function(m){ return [
            thumbHtml(m['产品图片URL']),
            '<span class="m">' + (m['SKU']||'—') + '</span>',
            m['目标市场']||'—',
            m['类目']||'—',
            m['季节范围']||'—',
            chip(m['处理状态']||'待处理', toneOf(m['处理状态'])),
            btn('详情', '', 'sku-dna', (m['SKU']||''))
          ]; })), {flush:true, note:'这些商品没填「父体ID」，去「商品资料填写」补上即可归入对应父体。'});
        }
        html += '<div id="fam-members">' + (famList.length ? renderMembers(famList[0]) : '') + '</div>';
        root.innerHTML = html;
        Array.prototype.forEach.call(document.querySelectorAll('.btn[data-famx]'), function(el){
          el.onclick = function(){
            var i = parseInt(el.getAttribute('data-famx'), 10);
            var fam = famList[i];
            if (fam) document.getElementById('fam-members').innerHTML = renderMembers(fam);
          };
        });
        
      });
    }, 0);
    return el;
  }
});
page('sku-dna', {
  roles:['运营','审核','管理员'],
  guide:[
    '这一页是系统看完你的资料和图片之后的<b>识别结果</b>。',
    '重点看「数据完整性」列：<b>已确认</b>=资料齐全；<b>不完整</b>=有必填缺失；<b>已拒绝</b>=有冲突。',
    '审核员可以<b>「审核通过」确认识别结果</b>，或<b>「打回重新识别」</b>让系统重新识别。'
  ],
  spec:{
    q:'系统"认为"这个商品是什么？图片看到了什么、哪些结论是推断的。',
    acts:['查看视觉证据','查看复核结果','对不符结论提异议'],
    wf:['WF-28-01 Product DNA（只读产物）'],
    reads:['fact_registry','truth_identity','visual_choice_prototype','forbidden_token'],
    writes:['无（异议写 audit_log）'],
    limits:[
      '本页<b>只读</b>',
      '图片能定图案/颜色/构图/风格，<b>不能定</b>材质/性能/安全/护理/尺寸/数量/包含物',
      '材质与工艺的视觉推断一律降级为「推断」，且不允许进标题'
    ]
  },
    body:function(){
    function pageParam(){
      var h = (location.hash || '').replace(/^#/, '');
      var idx = h.indexOf('?');
      if (idx >= 0){ var q = h.slice(idx+1); var ps = q.split('&'); for (var i=0;i<ps.length;i++){ var kvp = ps[i].split('='); if (kvp[0]==='sku') return decodeURIComponent((kvp[1]||'').replace(/\+/g,' ')); } return ''; }
      idx = h.indexOf('/');
      return idx >= 0 ? decodeURIComponent(h.slice(idx+1)) : '';
    }
    var sku = window.CUR_SKU || pageParam();
    var el = '<div id="sku-dna-root">' + ghost('正在加载系统识别结果…') + '</div>';
    setTimeout(function(){
      var root = document.getElementById('sku-dna-root');
      if (!root) return;
      Promise.all([API.table('产品识别结果', {}, 200), API.table('SKU_输入表', {}, 200)]).then(function(rs){
        var r1 = rs[0];
        if (!r1.ok || !r1.data || r1.data.success === false){ root.innerHTML = callout('stop','数据加载失败',(r1.data&&r1.data.error)||'请检查网络或稍后重试'); return; }
        var _all = ((r1.data.data)||[]).filter(function(x){ return x && x['SKU']; });
        (function(){ var m = {}; _all.forEach(function(x){ var k = x['SKU']; var t = String(x['识别时间']||''); if (!m[k] || t > String(m[k]['识别时间']||'')) m[k] = x; }); rows = Object.keys(m).map(function(k){ return m[k]; }); })();
        var rows = rows;
        var skuRows = ((rs[1] && rs[1].data && rs[1].data.data)||[]);
        if (!rows.length){ root.innerHTML = callout('warn','暂无识别结果','还没有商品完成「产品识别」。请先提交生成，系统会用 GPT-4o 识别产品图片、生成 9 维产品档案与精准主定位。'); return; }
        function safeParse(s){ if (!s) return null; if (typeof s === 'object') return s; try { return JSON.parse(s); } catch(e){ return null; } }
        function arr(v){ if (Array.isArray(v) && v.length) return v; if (typeof v === 'string' && v.trim()) return v.split(/[，,、;；]/).map(function(s){return s.trim();}).filter(Boolean); return []; }
        function st(v){ return (v === null || v === undefined || v === '') ? '—' : String(v); }
        function panel(t, c, o){ return '<div class="panel"' + (o && o.flush ? '' : ' style="margin-bottom:14px"') + '><div class="panel-t">' + t + '</div><div class="panel-b">' + c + '</div></div>'; }
        function kv(pairs){ return '<table class="kv"><tbody>' + pairs.map(function(p){ return '<tr><td class="k">' + p[0] + '</td><td class="v">' + p[1] + '</td></tr>'; }).join('') + '</tbody></table>'; }
        function dnaOf(row){
          var mode = st(row['识别方式']);
          var truth = safeParse(row['真相身份']) || {};
          var mp = safeParse(row['主定位']) || {};
          var kl = safeParse(row['关键词层级']) || {};
          var ev = (safeParse(row['视觉选择原型']) || {}).evidence || {};
          var color = safeParse(row['色彩定位']), elem = safeParse(row['核心元素']), style = safeParse(row['风格定位']);
          var aud = safeParse(row['人群画像']), carr = safeParse(row['家具载体']), scene = safeParse(row['使用场景']);
          var reason = safeParse(row['购买原因']), mood = safeParse(row['情绪氛围']), holiday = safeParse(row['季节节日']);
          var func = safeParse(row['核心功能']), spec = safeParse(row['规格参数']), diff = safeParse(row['差异化卖点']);
          /* ── [重排 09-16] 9 维档案卡片化：主值大字 + 其余 chips；主色带色板；空维度显式标「未识别」 ── */
          function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
          var COLOR_HEX = {'rot':'#D93A2B','红色':'#D93A2B','red':'#D93A2B','grün':'#4C9A2A','gruen':'#4C9A2A','绿色':'#4C9A2A','green':'#4C9A2A',
            'weiß':'#EFEFEF','weiss':'#EFEFEF','白色':'#EFEFEF','white':'#EFEFEF','blau':'#2A6FD9','蓝色':'#2A6FD9','blue':'#2A6FD9',
            'gelb':'#E8B72A','黄色':'#E8B72A','yellow':'#E8B72A','schwarz':'#2B2B2B','黑色':'#2B2B2B','black':'#2B2B2B',
            'rosa':'#E58BA8','粉色':'#E58BA8','pink':'#E58BA8','lila':'#8A5CD9','紫色':'#8A5CD9','purple':'#8A5CD9',
            'grau':'#9AA0A6','灰色':'#9AA0A6','grey':'#9AA0A6','gray':'#9AA0A6','orange':'#E8832A','橙色':'#E8832A',
            'braun':'#8B5E3C','棕色':'#8B5E3C','brown':'#8B5E3C','beige':'#E6DAC8','米色':'#E6DAC8'};
          function hexOf(n){ var k=String(n||'').toLowerCase().trim(); for (var key in COLOR_HEX){ if (k.indexOf(key) === 0 || k === key) return COLOR_HEX[key]; } return '#D5DAD8'; }
          function dot(n){ return '<i style="width:12px;height:12px;border-radius:50%;background:'+hexOf(n)+';border:1px solid rgba(0,0,0,.10);display:inline-block;vertical-align:-1px;margin-right:6px"></i>'; }
          function tags(list){
            if (!list || !list.length) return '';
            return '<div style="display:flex;flex-wrap:wrap;gap:5px">' + list.map(function(c){
              return '<span style="background:#F1F5F3;color:#4A5A55;font-size:11.5px;padding:2px 8px;border-radius:999px;line-height:1.6;border:1px solid #E8ECEA">'+esc(c)+'</span>';
            }).join('') + '</div>';
          }
          function card(no, title, mainVal, sub, chips){
            var empty = (!mainVal || mainVal === '—') && (!sub) && (!chips || !chips.length);
            // [fix 2026-09-18] 底色分级：① 色彩定位 / ② 核心元素 加深（最重要，一眼可辨）；其余间隔换底色，避免一片白
            var _n = parseInt(no, 10) || 99;
            var bg, bd;
            if (empty)        { bg = '#FAFBFA'; bd = '#E8ECEA'; }
            else if (_n === 1) { bg = '#DCEDE4'; bd = '#B8D8C9'; }
            else if (_n === 2) { bg = '#E9F4EE'; bd = '#CEE4D8'; }
            else              { bg = (_n % 2 === 0) ? '#F5FAF8' : '#FFFFFF'; bd = '#E8ECEA'; }
            return '<div style="border:1px solid '+bd+';border-radius:10px;padding:10px 12px;background:'+bg+'">' +
              '<div style="display:flex;align-items:center;gap:6px;margin-bottom:'+(empty?'0':'7px')+'">' +
                '<span style="min-width:17px;height:17px;border-radius:5px;background:'+(empty?'#F1F3F2':(_n<=2?'#CFE6DA':'#EAF6F1'))+';color:'+(empty?'#B0B8B4':'#1F7A5C')+';font-size:10.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center">'+no+'</span>' +
                '<span style="font-size:12.5px;font-weight:700;color:#2C3B36">'+title+'</span>' +
                (empty ? '<span style="margin-left:auto;font-size:11px;color:#B0B8B4">未识别</span>' : '') +
              '</div>' +
              (mainVal && mainVal !== '—' ? '<div style="font-size:'+(_n===1?'15.5px':'13.5px')+';font-weight:'+(_n===1?'700':'600')+';color:#111;line-height:1.5;margin-bottom:'+((sub||(chips&&chips.length))?'7px':'0')+'">'+mainVal+'</div>' : '') +
              (sub ? '<div style="font-size:12px;color:#7A857F;line-height:1.55;margin-bottom:'+((chips&&chips.length)?'7px':'0')+'">'+esc(sub)+'</div>' : '') +
              tags(chips) +
            '</div>';
          }
          function grid(inner){ return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px">'+inner+'</div>'; }
          function sec(t, note){ return '<div style="display:flex;align-items:baseline;gap:8px;margin:16px 0 9px"><span style="font-size:13.5px;font-weight:700;color:#2C3B36">'+t+'</span>'+(note?'<span style="font-size:11.5px;color:#9AA0A6">'+note+'</span>':'')+'</div>'; }
          var dimCards = [], dimTotal = 0, dimFilled = 0;
          function reg(html, filled){ dimTotal++; if (filled) dimFilled++; dimCards.push(html); }
          if (mode === 'visual') {
            var cz = color || {}; reg(card('1','色彩定位', cz.primary_color ? dot(cz.primary_color)+esc(cz.primary_color) : null, cz.color_system, (arr(cz.secondary_colors).concat(arr(cz.local_keywords)))), !!(cz.primary_color));
            var el2 = elem || {}; reg(card('2','核心元素', arr(el2.pattern_elements)[0], el2.pattern_elements && el2.pattern_elements[1] ? '还有：' + arr(el2.pattern_elements).slice(1).join('、') : '', el2.design_technique ? ['手法：'+el2.design_technique] : []), arr(el2.pattern_elements).length > 0);
            var sy = style || {}; reg(card('3','风格定位', sy.primary_style, arr(sy.secondary_styles).length ? '次风格：' + arr(sy.secondary_styles).join('、') : '', (sy.excluded_styles||[]).map(function(e){ return typeof e === 'string' ? ('排除 ' + e) : ('排除 ' + st(e.style)); })), !!sy.primary_style);
            var au = aud || {}; reg(card('4','人群画像', au.primary_audience, '', arr(au.secondary_audiences)), !!au.primary_audience);
            var ca = carr || {}; reg(card('5','家具载体', ca.primary_carrier, '次载体：' + (arr(ca.secondary_carriers).join('、')||'—'), []), !!ca.primary_carrier);
            var sc = scene || {}; reg(card('6','使用场景', sc.primary_scene, sc.pairing_suggestion ? '搭配：' + sc.pairing_suggestion : '', arr(sc.secondary_scenes)), !!sc.primary_scene);
            var rs2 = reason || {}; reg(card('7','购买原因', rs2.primary_motivation, '', arr(rs2.secondary_motivations)), !!rs2.primary_motivation);
            var mo = mood || {}; reg(card('8','情绪氛围', mo.atmosphere, '', arr(mo.mood_words)), !!(mo.atmosphere || arr(mo.mood_words).length));
            var ho = holiday || {}; reg(card('9','季节节日', ho.core_holiday, '兼容：' + (arr(ho.compatible_holidays).join('、')||'—'), []), !!ho.core_holiday);
          } else {
            var fu = func || {}; reg(card('1','核心功能', fu.primary_use, '', arr(fu.key_features)), !!fu.primary_use);
            reg(card('2','规格参数', null, typeof spec === 'object' ? Object.keys(spec||{}).map(function(k){ return k+'：'+st(spec[k]); }).join('；') : st(spec), []), !!spec && !!(typeof spec === 'object' ? Object.keys(spec).length : String(spec).length));
            var sc2 = scene || {}; reg(card('3','使用场景', sc2.primary_scene || sc2.usage_place, '', []), !!(sc2.primary_scene||sc2.usage_place));
            var au2 = aud || {}; reg(card('4','人群画像', au2.primary_audience, '', arr(au2.secondary_audiences)), !!au2.primary_audience);
            var rs3 = reason || {}; reg(card('5','购买原因', rs3.primary_motivation, '', []), !!rs3.primary_motivation);
            var mo2 = mood || {}; reg(card('6','情绪', arr(mo2.mood_words).join('、'), '', []), arr(mo2.mood_words).length>0);
            var ho2 = holiday || {}; reg(card('7','季节节日', ho2.core_holiday, '', []), !!ho2.core_holiday);
            reg(card('8','差异化卖点', null, '', arr(diff && diff.unique_selling_points ? diff.unique_selling_points : (diff ? [st(diff)] : []))), !!(diff && (arr(diff.unique_selling_points).length || st(diff).length)));
          }
          var rate = dimTotal ? Math.round(dimFilled * 100 / dimTotal) : 0;
          var hero =
            '<div style="border:1px solid #DDEBE4;background:linear-gradient(180deg,#F5FBF8,#fff);border-radius:12px;padding:14px 16px;margin-bottom:6px">' +
              '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
                '<span style="background:#1F7A5C;color:#fff;font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px">主定位</span>' +
                '<span style="font-size:11.5px;color:#7A857F">一句话产品画像 · 系统据此判定文案方向</span>' +
              '</div>' +
              '<div style="font-size:15px;font-weight:600;color:#111;line-height:1.55">' + (mp.local ? esc(mp.local) : '—') + '</div>' +
              (mp.zh ? '<div style="font-size:12.5px;color:#7A857F;margin-top:7px;line-height:1.6">' + esc(mp.zh) + '</div>' : '') +
            '</div>';
          var dimsHtml = sec('9 维识别档案', '已识别 ' + dimFilled + ' / ' + dimTotal + ' 维（' + rate + '%）') + grid(dimCards.join(''));
          var KW = [['产品词', kl && kl.product_words], ['差异词', kl && kl.differentiator_words], ['风格场景词', kl && kl.style_scene_words], ['人群动机词', kl && kl.audience_motivation_words], ['Backend 搜索词', kl && kl.backend_terms]];
          var kwHtml = sec('关键词层级', '供文案生成取词 · 4 层 + Backend') +
            grid(KW.map(function(p){
              var list = arr(p[1]);
              return '<div style="border:1px solid #E8ECEA;border-radius:10px;padding:10px 12px;background:#fff">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">' +
                  '<span style="font-size:12.5px;font-weight:700;color:#2C3B36">'+p[0]+'</span>' +
                  '<span style="font-size:11px;color:#9AA0A6">'+list.length+' 个</span>' +
                '</div>' + (tags(list) || '<span style="font-size:11.5px;color:#B0B8B4">未提取</span>') + '</div>';
            }).join(''));
          var ident = panel('识别信息', kv([
            ['SKU', row['SKU'] || '—'],
            ['识别方式', mode === 'functional' ? '功能识别' : '视觉识别（9 维）'],
            ['产品身份', truth.entity || '—'],
            ['识别模型', ev.vision_model || row['识别模型'] || '—'],
            ['识别时间', st(row['识别时间']).slice(0,16).replace('T',' ')],
          ]));
          return hero + dimsHtml + kwHtml + ident;
        }
        var imgMap = {};
        skuRows.forEach(function(sx){ if (sx && sx['SKU']) imgMap[sx['SKU']] = sx['产品图片URL'] || ''; });
        // [fix 2026-09-18] 下拉框只列「实际识别了什么」：同一父体+站点的多个尺寸共享同一份识别结果，
        // 不再按尺寸重复列出（原来 3 个尺寸 = 3 个几乎相同的条目，客户反馈「商品太多」）
        var _fam = {}, _gmap = {}, _gorder = [];
        (skuRows||[]).forEach(function(sx){ if (sx && sx['SKU']) _fam[sx['SKU']] = sx['产品族ID'] || ''; });
        rows.forEach(function(x){
          var k = String(_fam[x['SKU']] || x['SKU']) + '|' + String(x['目标市场'] || '');
          if (!_gmap[k]){ _gmap[k] = { rep:x['SKU'], market:x['目标市场'] || '', skus:[] }; _gorder.push(k); }
          _gmap[k].skus.push(x['SKU']);
        });
        var groups = _gorder.map(function(k){ return _gmap[k]; });
        var cur = sku;
        if (!cur || !rows.some(function(x){ return x['SKU'] === cur; })) cur = groups[0].rep;
        function pick(v){ return rows.filter(function(x){ return x['SKU'] === v; })[0] || rows[0]; }
        function imgInner(url){ if (!url) return '<div style="width:76px;height:76px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;background:#f3f4f6;border-radius:10px">无图片</div>'; return thumbHtml(url, 76); }
        var selOpts = groups.map(function(g){
          var lab = g.rep + '（' + g.market + (g.skus.length > 1 ? ' · 同款共 ' + g.skus.length + ' 个尺寸' : '') + '）';
          return '<option value="' + g.rep + '"' + (g.skus.indexOf(cur) >= 0 ? ' selected' : '') + '>' + lab + '</option>';
        }).join('');
        root.innerHTML =
          '<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;padding:12px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;flex-wrap:wrap">' +
            '<div id="dna-img-box" style="flex-shrink:0">' + imgInner(imgMap[cur]) + '</div>' +
            '<div style="flex:1;min-width:220px"><div style="font-size:11px;color:#888;margin-bottom:5px">当前识别商品（' + groups.length + ' 个款式 · 共 ' + rows.length + ' 个 SKU）</div>' +
            '<select id="dna-sku-sel" style="width:100%;max-width:520px;padding:7px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;font-weight:600;background:#fff">' + selOpts + '</select></div>' +
            '<div style="font-size:11px;color:#aaa;max-width:200px">下拉切换 → 查看该商品的产品图片与识别详情</div>' +
          '</div>' +
          '<div id="dna-content">' + dnaOf(pick(cur)) + '</div>';
        var sel = document.getElementById('dna-sku-sel');
        if (sel) sel.onchange = function(){
          var v = sel.value;
          window.CUR_SKU = v;
          var ib = document.getElementById('dna-img-box');
          if (ib) ib.innerHTML = imgInner(imgMap[v]);
          var ct = document.getElementById('dna-content');
          if (ct) ct.innerHTML = dnaOf(pick(v));
        };
      });
    }, 0);
    return el;
  }
});
/* ───────── ③ 生成文案 ───────── */
page('gen-new', {
  roles:['运营','审核','管理员'],
  guide:[
    '下拉里只显示<b>还没生成文案的商品</b>（按 SKU 排序），选一个再选目标站点。',
    '商品资料不完整会提示你，<b>先去「商品资料填写」补资料</b>再回来提交。',
    '提交后系统后台生成（一般 12 分钟内），去「生成进度」看状态。'
  ],
  spec:{
    q:'我要为哪些商品、哪些站点生成文案，用哪一版数据和设置。',
    acts:['选商品（单个/批量）','选站点','指定关键词数据版本','预检','提交'],
    wf:['提交 → WF-28-00 主编排（webhook 触发，发完即走）'],
    reads:['sku','marketplace_config','keyword_snapshot','param_version','prompt_version','model_profile'],
    writes:['run','job_queue','audit_log'],
    limits:[
      '提交前必须<b>预检通过</b>：资料完整 + 数据存在 + 设置版本齐全',
      '每个任务落库时锁定<b>版本六元组</b>，之后改设置不影响在跑的任务',
      '不允许提交时临时改参数——参数只能在 ⑥ 系统设置里改并生成新版本'
    ]
  },
  body:function(){
    function pageParam(){ var h = (location.hash || '').replace(/^#/, ''); var idx = h.indexOf('/'); return idx >= 0 ? decodeURIComponent(h.slice(idx + 1)) : ''; }
    var preSku = window.CUR_SKU || pageParam();
    var html = '<div class="cols c21">' +
      panel('选择商品与站点', '<div class="form g2">'+
        fld('选择商品 <span style="color:var(--red)">*</span>', '<select id="gen-sku" class="ctl"><option>正在加载商品…</option></select>', '从「人工审核重做」进来会预选该商品；正常提交只显示还没生成文案的商品') +
        fld('目标市场', '<select id="gen-market" class="ctl"><option>US</option><option>GB</option><option>DE</option><option>FR</option><option>IT</option><option>ES</option><option>CA</option></select>') +
        fld('季节范围', '<select id="gen-season" class="ctl"><option value="ALL_SEASON">四季通用</option><option value="SPRING_SUMMER">春夏</option><option value="AUTUMN_WINTER">秋冬</option><option value="CHRISTMAS">圣诞节</option><option value="THANKSGIVING">感恩节</option></select>', '可修改（从「人工审核重做」进来时改完再提交）') +
        fld('品牌名', '<input id="gen-brand" class="ctl" placeholder="如 HomGoodz">', '可修改') +
        fld('文案语言', '<select id="gen-lang" class="ctl"><option value="en-US">英文</option><option value="en-GB">英文(英式)</option><option value="de-DE">德文</option><option value="fr-FR">法文</option><option value="it-IT">意大利文</option><option value="es-ES">西班牙文</option></select>', '选择文案语言') +
        fld('标题是否包含材质', '<label style="display:flex;align-items:center;gap:8px;font-weight:normal"><input type="checkbox" id="gen-title-mat" style="width:auto"> 允许材质词进标题（春夏防水款 / 材质是核心卖点时勾选）</label>') +
        fld('词库参与生成', '<label style="display:flex;align-items:center;gap:8px;font-weight:normal"><input type="checkbox" id="gen-use-kw" checked style="width:auto"> 关键词库 / 广告词库参与文案生成</label>') +
        fld('参与的季节/假日', '<select id="gen-kw-season" class="ctl"><option value="">不按季节筛词（默认）</option></select>', '一个商品只属于一个季节/节日——商品自身的季节在上面「季节范围」里定。这里默认不筛；<b>只有</b>需要额外参考某个节日词库时才选。') +
      '</div>' +
      '<div style="margin-top:16px;font-size:12.5px;color:var(--t-2);font-weight:500">竞品 ASIN（选填，最多 3 个）</div>' +
      '<div class="hint" style="font-size:11.5px;color:var(--t-3);margin:4px 0 8px">填<b>该市场</b>正在跑的竞品商品 ASIN，生成时系统会把竞品流量词纳入候选池；不填不影响生成。</div>' +
      '<div class="form g3">' +
        fld('竞品 ASIN 1', '<input id="gen-asin1" class="ctl" placeholder="B0XXXXXXXXX">') +
        fld('竞品 ASIN 2', '<input id="gen-asin2" class="ctl" placeholder="B0XXXXXXXXX">') +
        fld('竞品 ASIN 3', '<input id="gen-asin3" class="ctl" placeholder="B0XXXXXXXXX">') +
      '</div>' +
      '<div class="btnrow" style="margin-top:16px">' +
        '<button class="btn" id="gen-submit" style="background:var(--g-600);color:#fff;border:none;padding:9px 18px;border-radius:var(--r-ctl);font-weight:600;cursor:pointer">提交生成</button>' +
      '</div>' +
      '<div id="gen-result" style="margin-top:12px"></div>') +
    '</div>';
    setTimeout(function(){
    function loadSeasons(selId, keepVal){
      API.table('季节配置', {}, 50).then(function(r){
        var rows = (r.ok && r.data && r.data.data) ? r.data.data.filter(function(x){ return x && x['季节代码'] && x['启用'] !== false; }) : [];
        if (!rows.length) return;
        if (!window._SEASON_NAME2CODE) window._SEASON_NAME2CODE = {};
        rows.forEach(function(x){ window._SEASON_NAME2CODE[x['季节名称']] = x['季节代码']; });
        var sel = document.getElementById(selId);
        if (sel){
          var cur = keepVal || sel.value;
          sel.innerHTML = rows.map(function(x){
            return '<option value="'+x['季节代码']+'">'+x['季节名称']+'</option>';
          }).join('');
          if (cur){ var found = rows.some(function(x){ return x['季节代码'] === cur; }); if (found) sel.value = cur; }
        }
        // [fix 09-16ai] 「参与的季节/假日」下拉：原代码只填了「季节范围」，这个框永远空白（客户反馈：没有下拉框）
        var kwSel = document.getElementById('gen-kw-season');
        if (kwSel){
          var kcur = kwSel.value || '';
          kwSel.innerHTML = '<option value="">不按季节筛词（默认）</option>' + rows.map(function(x){
            return '<option value="'+x['季节代码']+'">'+x['季节名称']+'</option>';
          }).join('');
          kwSel.value = kcur;
        }
      });
    }
            var skuRows = [];
            var marketSel = document.getElementById('gen-market');
      var langSel = document.getElementById('gen-lang');
      var skuSel = document.getElementById('gen-sku');
      loadSeasons('gen-season', '');
      marketSel.onchange = function(){ var lmap = {US:'en-US', GB:'en-GB', FR:'fr-FR', IT:'it-IT', ES:'es-ES'}; if (langSel) langSel.value = lmap[marketSel.value] || 'en-US'; };
      Promise.all([API.skus({}), API.listings()]).then(function(rs){
        skuRows = (rs[0].ok && rs[0].data && rs[0].data.data) ? rs[0].data.data : [];
        var listingRows = (rs[1].ok && rs[1].data && rs[1].data.data) ? rs[1].data.data : [];
        var done = {};
        listingRows.forEach(function(x){ if (x['SKU']) done[x['SKU']] = 1; });
        var rows = (preSku && skuRows.filter(function(x){ return x['SKU'] === preSku; }).length)
          ? skuRows.filter(function(x){ return x['SKU'] === preSku; })
          : skuRows.filter(function(x){ return x['记录ID'] && !done[x['SKU']]; });
        rows.sort(function(x, y){ return String(y['创建时间']||y['更新时间']||'').localeCompare(String(x['创建时间']||x['更新时间']||'')); });
        if (!skuSel) return;
        if (!rows.length){ skuSel.innerHTML = '<option>所有商品都已生成文案</option>'; return; }
        skuSel.innerHTML = rows.map(function(x){ return '<option value="'+(x.SKU||'')+'">'+(x.SKU||'')+'</option>'; }).join('');
      });
      var btn = document.getElementById('gen-submit');
      if (btn) btn.onclick = function(){
        function val(id){ return (document.getElementById(id)||{}).value || ''; }
        var sku = val('gen-sku');
        var result = document.getElementById('gen-result');
        if (!sku || sku.indexOf('正在') === 0 || sku.indexOf('暂无') === 0){
          result.innerHTML = callout('warn','请先选商品','从下拉里选一个商品；没有的话先去「商品资料填写」新增。');
          return;
        }
        btn.disabled = true; btn.textContent = '提交中…';
        var skuInfo = skuRows.find(function(x){ return x['SKU'] === sku; }) || {};
        var nm = skuInfo['季节范围'];
        var nm2code = (window._SEASON_NAME2CODE || {});
        var code = nm2code[nm] || nm || 'ALL_SEASON';
        var _se = document.getElementById('gen-season');
        if (_se){ var has = _se.querySelector('option[value="'+code+'"]'); if (!has){ _se.innerHTML = '<option value="'+code+'">'+(nm||code)+'</option>' + _se.innerHTML; } _se.value = code; }
        var _br = document.getElementById('gen-brand'); if (_br) _br.value = skuInfo['品牌名'] || '';
        var sess = (typeof session === 'function') ? session() : null;
        var body = { sku: sku, marketplace: val('gen-market') || 'US', category: skuInfo['类目'] || skuInfo['category'] || '', season_scope: val('gen-season') || skuInfo['季节范围'] || '', brand_name: val('gen-brand') || skuInfo['品牌名'] || '', product_image_url: skuInfo['产品图片URL'] || skuInfo['product_image_url'] || '', locale: val('gen-lang') || '', competitor_asin1: val('gen-asin1').trim(), competitor_asin2: val('gen-asin2').trim(), competitor_asin3: val('gen-asin3').trim(), executed_by: (sess && sess.user_name) || '', title_include_material: (document.getElementById('gen-title-mat')||{}).checked || false, use_keyword_db: ((document.getElementById('gen-use-kw')||{}).checked !== false), keyword_seasons: (val('gen-kw-season') || '') };
        API.generate(body).then(function(r){
          btn.disabled = false; btn.textContent = '提交生成';
          if (r.ok && r.data && r.data.success) {
            result.innerHTML = callout('warn', preSku ? '已重新提交，正在生成' : '已提交，正在生成','SKU '+r.data.sku+' 已进入生成队列，主编排后台生成（一般 12 分钟内），可在「生成进度」查看状态。');
            // [fix 09-16ak] 提交成功 → 自动重载本页：该 SKU 从「待生成」下拉里消失，排队状态即刻反映（客户反馈）
            toast('SKU ' + r.data.sku + ' 已提交生成，页面已刷新');
            setTimeout(function(){ if (typeof render === 'function') render(); }, 700);
          } else {
            result.innerHTML = callout('warn','提交失败', (r.data && r.data.error) || '请检查网络或稍后重试');
          }
        });
      };
    }, 0);
    return html;
  }
});
page('gen-queue', {
  roles:['运营','审核','管理员'],
  guide:[
    '同时最多跑 3 条，其余排队——这是为了控制费用和服务器压力，不是卡住了。',
    '急的可以调「优先级」插队；不要的可以取消。',
    '<b>取消不退已经花掉的费用</b>，越早取消越好。'
  ],
  spec:{
    q:'排了多少任务、什么时候轮到我的、要不要插队或取消。',
    acts:['取消','调优先级','批量重跑','查看批次'],
    wf:['WF-28-00（只读队列状态）'],
    reads:['job_queue','run','batch'],
    writes:['job_queue.priority','run.status'],
    limits:['并发上限由成本护栏决定，不允许在此页突破','取消不退还已消耗费用']
  },
    body:function(){
    function toneOf(st){ var s = String(st||'').toUpperCase(); if (s==='PROCESSING') return 'run'; if (s==='PENDING') return 'neutral'; if (s==='FAILED') return 'fail'; return 'neutral'; }
    function toLocal(iso){
      if (!iso) return '—';
      var s = String(iso);
      var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
      if (!m) return s.slice(0,16).replace('T',' ');
      var d = new Date(s);
      if (isNaN(d.getTime())) return s.slice(0,16).replace('T',' ');
      var u = new Date(d.getTime() + 8*3600*1000);
      function p(n){ return (n<10?'0':'')+n; }
      return u.getUTCFullYear()+'-'+p(u.getUTCMonth()+1)+'-'+p(u.getUTCDate())+' '+p(u.getUTCHours())+':'+p(u.getUTCMinutes());
    }
    var el = '<div id="gen-queue-root">' + ghost('正在加载排队情况…') + '</div>';
    setTimeout(function(){
      API.table('SKU_输入表', {}, 200).then(function(r){
        var root = document.getElementById('gen-queue-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['SKU']; });
        var q = rows.filter(function(x){ var s = String(x['处理状态']||'').toUpperCase(); return s === 'PENDING' || s === 'PROCESSING'; });
        /* [fix 09-16al] 优先级仍是主键（急件可插队）；同优先级改为**新创建的在前**（原来早的在先，
           刚提交的任务沉在队列底部，客户找不到）。 */
        q.sort(function(a,b){ var pa=parseInt(a['优先级']||'0')||0, pb=parseInt(b['优先级']||'0')||0; if (pa!==pb) return pa-pb; return String(b['创建时间']||'').localeCompare(String(a['创建时间']||'')); });
        if (!q.length){ root.innerHTML = callout('warn','暂无数据','当前没有排队中或处理中的任务。'); return; }
        var running = q.filter(function(x){ return String(x['处理状态']||'').toUpperCase() === 'PROCESSING'; }).length;
        var pending = q.length - running;
        root.innerHTML =
          stats([
            ['处理中', running, 'PROCESSING', 'run', false],
            ['排队等待', pending, 'PENDING', '', false],
          ], 2) +
          panel('队列（' + q.length + ' 条）', pagedTable(
            ['图片','SKU','产品族','站点','处理状态','优先级','更新时间',''],
            q.map(function(x){ return [
              thumbHtml(x['产品图片URL']),
              '<span class="m">' + (x['SKU']||'—') + '</span>',
              x['产品族ID']||'—',
              x['目标市场']||'—',
              chip(x['处理状态']||'', toneOf(x['处理状态'])),
              (x['优先级'] ? '<span class="chip chip--run">优先</span>' : '—'),
              '<span class="m">' + toLocal(x['更新时间']) + '</span>',
              '<button class="btn btn--ghost" data-qa="priority" data-rid="'+encodeURIComponent(x['记录ID']||'')+'">优先</button> <button class="btn btn--danger" data-qa="cancel" data-rid="'+encodeURIComponent(x['记录ID']||'')+'">取消</button>'
            ]; })
          ), {flush:true});
        root.addEventListener('click', function(e){
          var b = e.target.closest('button[data-qa]');
          if (!b) return;
          var rid = decodeURIComponent(b.getAttribute('data-rid')||'');
          var act = b.getAttribute('data-qa');
          if (act === 'cancel'){
            if (!confirm('确认取消该任务？取消后不再排队，已花费用不退。')) return;
            API.queueManage({action:'cancel', recordId: rid}).then(function(rr){
              if (rr && rr.ok && rr.data && rr.data.success){ toast('已取消'); setTimeout(function(){ location.reload(); }, 500); }
              else { toast('取消失败：'+((rr&&rr.data&&rr.data.error)||'请重试')); }
            });
          } else if (act === 'priority'){
            API.queueManage({action:'priority', recordId: rid}).then(function(rr){
              if (rr && rr.ok && rr.data && rr.data.success){ toast('已置顶'); setTimeout(function(){ location.reload(); }, 500); }
              else { toast('置顶失败：'+((rr&&rr.data&&rr.data.error)||'请重试')); }
            });
          }
        });
      });
    }, 0);
    return el;
  }
});
page('gen-run', {
  roles:['运营','审核','管理员'],
  guide:[
    '整个生成分<b>三大段</b>：先搞懂商品和市场 → 再决定写什么并写出来 → 最后自检交付。',
    '每段里面是具体步骤。<b>绿色=已完成，深绿=正在做，灰色=还没轮到，红色=出问题了</b>。',
    '不用一直盯着——一般 12 分钟内跑完，完成后会出现在你的待办里。'
  ],
  spec:{
    q:'这条任务走到哪了、卡在哪、为什么卡。',
    acts:['取消','只重做失败的字段','转人工','下载中间产物'],
    wf:['重试 → WF-28-08 定向重试路由'],
    reads:['run','certificate','field_candidate（聚合）','audit_log','isolation_envelope'],
    writes:['run.status','audit_log'],
    limits:[
      '<b>本页不允许改任何内容</b>，只能重跑',
      '取消只改状态标记，不直接杀 n8n 执行',
      '隔离信息每步校验，任一不一致立即停止'
    ]
  },
    body:function(){
    function pageParam(){ var h = (location.hash || '').replace(/^#/, ''); var idx = h.indexOf('/'); return idx >= 0 ? decodeURIComponent(h.slice(idx + 1)) : ''; }
    var runParam = pageParam();
    var el = '<div id="gen-run-root">' + ghost('正在加载运行详情…') + '</div>';
    setTimeout(function(){
      Promise.all([API.table('运行日志表', {}, 200), API.table('产品识别结果', {}, 200), API.table('证书表', {}, 200), API.table('定稿输出表', {}, 200)]).then(function(RS){
        var r = RS[0];
        var _dnaRows   = (((RS[1]||{}).data||{}).data) || [];
        var _certRows  = (((RS[2]||{}).data||{}).data) || [];
        var _finalRows = (((RS[3]||{}).data||{}).data) || [];
        var root = document.getElementById('gen-run-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['运行ID'] && x['SKU']; });
        if (!rows.length){ root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        function t(st){ var s = String(st||'').toUpperCase(); if (s==='SUCCESS'||s==='COMPLETED') return 'ok'; if (s==='FAILED') return 'fail'; if (s==='REVIEW_REQUIRED') return 'warn'; return ''; }
        function bjTime(t){ if(!t) return '—'; var d = new Date(t); if(isNaN(d.getTime())) return String(t).slice(0,16).replace('T',' '); var bj = new Date(d.getTime() + 8*3600*1000); var p = function(n){ return (n<10?'0':'')+n; }; return bj.getUTCFullYear()+'-'+p(bj.getUTCMonth()+1)+'-'+p(bj.getUTCDate())+' '+p(bj.getUTCHours())+':'+p(bj.getUTCMinutes()); }
        // 同 run 会按阶段 append 多行（PROCESSING/SUCCESS/DRAFT_WRITTEN…），选代表行：终态优先，同态取时间最新
        (function(){ var g = {}; rows.forEach(function(x){ var rid = x['运行ID'] || ('SKU:'+x['SKU']); (g[rid] = g[rid] || []).push(x); });
          function isTerm(u){ var s = String(u||'').toUpperCase(); return s==='SUCCESS'||s==='COMPLETED'||s==='FAILED'||s==='REVIEW_REQUIRED'||s==='DRAFT_WRITTEN'; }
          function tRank(u){ var s = String(u||'').toUpperCase(); if(s==='REVIEW_REQUIRED') return 0; if(s==='FAILED') return 1; if(s==='SUCCESS'||s==='COMPLETED') return 2; if(s==='DRAFT_WRITTEN') return 3; return 9; }
          rows = Object.keys(g).map(function(rid){ var arr = g[rid];
            var term = arr.filter(function(x){ return isTerm(x['最终状态']); });
            var pool = term.length ? term : arr;
            pool.sort(function(a,b){ var ra = tRank(a['最终状态']), rb = tRank(b['最终状态']); if(ra !== rb) return ra - rb; return String(b['结束时间']||b['开始时间']||'').localeCompare(String(a['结束时间']||a['开始时间']||'')); });
            return pool[0];
          }); })();
        if (runParam){
          var row = rows.filter(function(x){ return x['运行ID'] === runParam; })[0];
          if (!row){ root.innerHTML = callout('warn','未找到该任务','运行ID ' + runParam + ' 不存在。'); return; }
          root.innerHTML =
            panel('任务详情 · ' + runParam, kv([
              ['SKU', row['SKU']||'—'],
              ['站点', row['目标市场']||'—'],
              ['最终状态', chip(row['最终状态']||'', t(row['最终状态']))],
              ['耗时', (row['耗时秒']||'—') + ' 秒'],
              ['提交时间', bjTime(row['开始时间'])],
              ['完成时间', bjTime(row['结束时间'])],
            ]), {flush:true}) +
            (function(){
              /* ── [重写 09-16] 真实链路 = WF-28-00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 10（不是旧文案里的 12 步）
                 每段「实际执行数据」三处一手来源：产品识别结果 / 定稿输出表(field_status_json) / 证书表 ── */
              var _sku = row['SKU'] || '';
              function _latest(arr, key, idKey){ return arr.filter(function(x){ return x[idKey] === _sku; }).sort(function(a,b){ return String(b[key]||'').localeCompare(String(a[key]||'')); })[0] || null; }
              var dna  = _latest(_dnaRows, '识别时间', 'SKU');
              var fin  = _latest(_finalRows, '生成时间', 'SKU');
              var cert = _latest(_certRows, '生成时间', 'SKU');
              var fst = {}; try { fst = JSON.parse((fin||{})['field_status_json'] || (fin||{})['字段状态'] || '{}'); } catch(e){ fst = {}; }
              function jsonOf(v){ if (!v) return null; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch(e){ return null; } }
              function badge(txt, tone){ return '<span style="font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:999px;background:'+(tone==='ok'?'#EAF6F1':(tone==='fail'?'#FBEAE7':(tone==='warn'?'#FDF3E3':'#F1F3F2')))+';color:'+(tone==='ok'?'#1F7A5C':(tone==='fail'?'#C0392B':(tone==='warn'?'#9A6B1F':'#8A9390')))+'">'+txt+'</span>'; }
              function mline(label, val, tone){ return '<div style="display:flex;gap:8px;font-size:12px;line-height:1.75"><span style="color:#8A9390;min-width:76px;flex-shrink:0">'+label+'</span><span style="color:'+(tone==='ok'?'#1F7A5C':(tone==='fail'?'#C0392B':'#2C3B36'))+';font-weight:500">'+val+'</span></div>'; }
              function stage(no, name, wf, state, metrics, note){
                var dotBg = state==='done' ? '#1F7A5C' : (state==='fail' ? '#C0392B' : '#C9CFCC');
                var stTxt = state==='done' ? '已完成' : (state==='fail' ? '失败' : (state==='partial' ? '无独立指标' : '未执行'));
                var tone  = state==='done' ? 'ok' : (state==='fail' ? 'fail' : (state==='partial' ? 'warn' : ''));
                return '<div style="display:flex;gap:11px;padding:10px 0;border-bottom:1px solid #F1F3F2">' +
                  '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:'+dotBg+';color:#fff;font-size:10.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-top:2px">'+no+'</span>' +
                  '<div style="flex:1;min-width:0">' +
                    '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:5px">' +
                      '<span style="font-size:13px;font-weight:700;color:#2C3B36">'+name+'</span>' +
                      '<span style="font-size:10.5px;color:#9AA0A6;font-family:ui-monospace,monospace">'+wf+'</span>' + badge(stTxt, tone) +
                    '</div>' +
                    (metrics && metrics.length ? metrics.join('') : '<div style="font-size:12px;color:#B0B8B4">本阶段无独立落库指标</div>') +
                    (note ? '<div style="font-size:11.5px;color:#9AA0A6;margin-top:4px;line-height:1.6">'+note+'</div>' : '') +
                  '</div></div>';
              }
              var S=[], doneN=0, total=9;
              function add(h, ok){ if (ok) doneN++; S.push(h); }
              var allMs = (r.data.data||[]).filter(function(x){ return x['运行ID']===row['运行ID'] && x['SKU']===_sku; }).map(function(x){ return x['最终状态']; });
              add(stage('1','主编排 · 隔离与调度','WF-28-00', String(row['最终状态']).toUpperCase()==='FAILED'?'fail':'done', [
                mline('最终状态','<b>'+(row['最终状态']||'—')+'</b>'),
                mline('提交 / 完成', bjTime(row['开始时间'])+' → '+bjTime(row['结束时间'])),
                mline('执行人', row['执行人']||'—'),
                mline('状态里程碑', allMs.join(' → ')||'—')
              ]), String(row['最终状态']).toUpperCase()!=='FAILED');
              var dimRate='—', factN='—', forbN='—', truth=dna?jsonOf(dna['真相身份']):null, fr=dna?jsonOf(dna['事实注册表']):null;
              if (dna){
                var D=[dna['色彩定位'],dna['核心元素'],dna['风格定位'],dna['人群画像'],dna['家具载体'],dna['使用场景'],dna['购买原因'],dna['情绪氛围'],dna['季节节日']];
                var fl=D.filter(function(v){ return v && String(v).replace(/[{}\[\]"\s]/g,'').length>4; }).length;
                dimRate = fl+' / 9 维（'+Math.round(fl*100/9)+'%）';
                factN = Array.isArray(fr) ? (fr.length+' 条') : '—';
                forbN = (truth&&Array.isArray(truth.forbidden)) ? (truth.forbidden.length+' 条') : '—';
              }
              add(stage('2','产品识别 · Product DNA','WF-28-01', dna?'done':'fail', dna?[
                mline('识别方式', dna['识别方式']==='functional'?'功能识别':'视觉识别（9 维）'),
                mline('9 维完整度', dimRate),
                mline('事实注册表', factN+'（身份 '+((truth&&truth.entity)||'—')+'）'),
                mline('禁用词', forbN),
                mline('识别时间', bjTime(dna['识别时间']))
              ]:[], dna?'未找到该 SKU 的识别结果':null), !!dna);
              add(stage('3','数据摄取与候选词池','WF-28-02','partial',[],'链路已执行；该阶段未按任务落库独立指标（词库摄取量 / 候选池条数），故不编造数字。'), false);
              add(stage('4','语义意图层','WF-28-03','partial',[],'链路已执行；未按任务落库独立指标（关系矩阵 8 类 / 金字塔四层）。'), false);
              add(stage('5','字段规划与准入','WF-28-04','partial',[],'链路已执行；未按任务落库独立指标（台账条数 / 已准入候选数）。'), false);
              add(stage('6','前台写作 · 标题 / 亮点 / 五点','WF-28-05', fin?'done':'fail', fin?[
                mline('标题来源', fst.title_source||'—'),
                mline('标题', (fin['Title']||'—')+'　<b>'+(fin['Title字符数']||'')+'</b> 字符'),
                mline('亮点来源', fst.highlights_source||'—'),
                mline('亮点', '<b>'+(fin['Highlights字符数']||'')+'</b> 字符 · '+(fin['Highlights短语数']||'—')+' 个短语'),
                mline('五点来源', fst.bullets_source||'—'),
                mline('五点各条', ['1','2','3','4','5'].map(function(n){ return (fin['Bullet '+n+'字符数']||'—'); }).join(' / ')+' 字符')
              ]:[], null), !!fin);
              add(stage('7','Backend 搜索词','WF-28-06', fin?'done':'fail', fin?[
                mline('生成方式', fst.backend_source||'—'),
                mline('字节占用', '<b>'+(fin['Backend字节数']||'—')+'</b> 字节')
              ]:[], null), !!fin);
              var certHtml='';
              if (cert){
                certHtml = ['完整性证书','处理证书','字段证书','质量证书','审计证书'].map(function(n){
                  var o=jsonOf(cert[n]); var st=o?String(o.status||''):'—'; var sm=(o&&o.summary)||{};
                  var u=st.toUpperCase();
                  return '<span style="display:inline-block;margin:0 9px 4px 0;font-size:12px">'+n.replace('证书','')+' '+
                    badge(st||'—', (u==='PASS'||u==='PASS_WITH_NOTES')?'ok':(u.indexOf('FAIL')===0?'fail':'warn'))+
                    ' <span style="font-size:11px;color:#8A9390">'+(sm.passed||0)+'/'+(sm.total||0)+'</span></span>';
                }).join('');
              }
              var allPass = cert && String(cert['全部通过']).toUpperCase()==='TRUE';
              add(stage('8','审计与五证书','WF-28-07', cert?'done':'fail', cert?[
                mline('是否全通过', allPass?'是 ✅':'否', allPass?'ok':'fail'),
                mline('未验证项', String(fst.not_verified_count!=null?fst.not_verified_count:'—')+' 项'),
                '<div style="margin-top:6px">'+certHtml+'</div>'
              ]:[], null), !!cert);
              add(stage('9','定稿落库 · 可上架','WF-28-10', fin?'done':'fail', fin?[
                mline('定稿版本号', fin['定稿版本号']||'—'),
                mline('生成时间', bjTime(fin['生成时间'])),
                mline('落地状态', allPass?'可上架 ✅':'待人工审核')
              ]:[], null), !!fin);
              return '<div style="display:flex;align-items:center;gap:10px;margin:14px 0 7px;flex-wrap:wrap">' +
                  '<span style="font-size:13.5px;font-weight:700;color:#2C3B36">生成链路（真实 9 段）</span>' +
                  '<span style="font-size:11.5px;color:#8A9390">已取得证据 '+doneN+' / '+total+' 段</span>' +
                '</div>' +
                '<div style="border:1px solid #E8ECEA;border-radius:12px;padding:2px 14px;background:#fff">'+S.join('')+'</div>' +
                '<div style="font-size:11.5px;color:#9AA0A6;margin-top:7px;line-height:1.7">第 2/6/7/8/9 段的数据来自<b>实际落库产物</b>（识别结果 / 定稿 / 证书）；第 3/4/5 段目前未按任务落库独立指标，只标链路位次、<b>不编造数字</b>。</div>';
            })();        } else {
        // SKU 级折叠：同 SKU+站点 只保留「最新一次 run」（按结束时间最晚），旧 run 失败记录不冒充当前状态
        (function(){ var g2 = {}; rows.forEach(function(x){ var k = (x['SKU']||'') + '|' + (x['目标市场']||''); var cur = g2[k];
          if (!cur || String(x['结束时间']||x['开始时间']||'') > String(cur['结束时间']||cur['开始时间']||'')) g2[k] = x; });
          rows = Object.keys(g2).map(function(k){ return g2[k]; }); })();
        var succ = rows.filter(function(x){ return String(x['最终状态']||'').toUpperCase()==='SUCCESS'; }).length;
        var fail = rows.filter(function(x){ return String(x['最终状态']||'').toUpperCase()==='FAILED'; }).length;
        var revw = rows.filter(function(x){ return String(x['最终状态']||'').toUpperCase()==='REVIEW_REQUIRED'; }).length;
        /* [fix 09-16al] 排序口径：**新创建/待处理的排最前**（原先新商品的「处理状态」不在已知取值里 → 被判成 5 → 沉到列表最底部，客户反馈"新建的找不到"）。
   分组：0 需人工处理 / 1 新创建·待处理 / 2 生成中 / 3 已完成 / 4 失败 / 5 其他 */
        function statusRank(s){
          var u = String(s||'').toUpperCase().trim();
          if (u === 'REVIEW_REQUIRED') return 0;
          if (u === '' || u === '待处理' || u === '新创建' || u === 'PENDING' || u === 'NEW') return 1;
          if (u === 'PROCESSING') return 2;
          if (u === 'COMPLETED' || u === 'SUCCESS') return 3;
          if (u === 'FAILED') return 4;
          return 5;
        }
        
rows.sort(function(a,b){ var ra=statusRank(a['最终状态']), rb=statusRank(b['最终状态']); if(ra!==rb) return ra-rb; return String(b['结束时间']||b['开始时间']||'').localeCompare(String(a['结束时间']||a['开始时间']||'')); });
        root.innerHTML =
          stats([
            ['运行总数', rows.length, '运行日志表', '', false],
            ['成功', succ, '', 'ok', false],
            ['失败', fail, '', 'fail', false],
            ['需人工', revw, '', 'warn', false],
          ], 4) +
          panel('运行列表（' + rows.length + ' 条）', pagedTable(
            ['SKU','站点','最终状态','提交时间','完成时间',''],
            rows.map(function(x){ return [
              x['SKU']||'—',
              x['目标市场']||'—',
              chip(x['最终状态']||'', t(x['最终状态'])),
              '<span class="m">' + bjTime(x['开始时间']) + '</span>',
              '<span class="m">' + bjTime(x['结束时间']) + '</span>',
              btn('详情', '', (function(y){ var st = String(y['最终状态']||'').toUpperCase(); if (st === 'REVIEW_REQUIRED') return 'rev-manual'; if (st === 'SUCCESS' || st === 'COMPLETED') return 'rev-detail'; return 'gen-run/' + (y['运行ID']||''); })(x), (x['SKU']||''))
            ]; })
          ), {flush:true});
        }
      });
    }, 0);
    return el;
  }
});
page('gen-retry', {
  roles:['运营','审核','管理员'],
  guide:[
    '这里是<b>失败和需要人工审核</b>的任务清单。',
    '点「重新提交」会让系统重新生成一遍，<b>已经写好的部分不会白费</b>。',
    '重新提交前，先回「商品资料填写」把资料改对。'
  ],
  spec:{
    q:'哪个字段失败了、按规则该怎么修、还剩几次机会。',
    acts:['执行定向重试','转人工复核','查看失败字段的选词记录'],
    wf:['WF-28-08 定向重试路由 → 回到 WF-28-05 / 06 局部'],
    reads:['run','certificate','field_candidate','retry_log'],
    writes:['run.retry_count','audit_log'],
    limits:[
      '每字段最多 3 次；超限强制转人工，不允许手动加次数',
      '<b>只重跑失败字段</b>，已通过字段保持冻结',
      '修复动作来自 18 条固定规则，不由人临时决定'
    ]
  },
    body:function(){
    window.retrySku = function(sku){
      API.generate({sku: sku}).then(function(r){
        if (r.ok && r.data && r.data.success) toast('SKU ' + sku + ' 已重新提交生成');
        else toast('重新提交失败：' + ((r.data && r.data.error) || '请检查网络'));
      });
    };
    var el = '<div id="gen-retry-root">' + ghost('正在加载失败任务…') + '</div>';
    setTimeout(function(){
      API.table('SKU_输入表', {}, 200).then(function(r){
        var root = document.getElementById('gen-retry-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['SKU']; });
        var failed = rows.filter(function(x){ var s = String(x['处理状态']||'').toUpperCase(); return s === 'FAILED' || s === 'REVIEW_REQUIRED'; });
    // [fix 09-16al] 新发生的失败/需人工排最上面（原来无排序）
    failed.sort(function(a, b){ return String(b['更新时间'] || b['结束时间'] || b['开始时间'] || '').localeCompare(String(a['更新时间'] || a['结束时间'] || a['开始时间'] || '')); });
        function bjTime(t){ if(!t) return '—'; var d = new Date(t); if(isNaN(d.getTime())) return String(t).slice(0,16).replace('T',' '); var bj = new Date(d.getTime() + 8*3600*1000); var p = function(n){ return (n<10?'0':'')+n; }; return bj.getUTCFullYear()+'-'+p(bj.getUTCMonth()+1)+'-'+p(bj.getUTCDate())+' '+p(bj.getUTCHours())+':'+p(bj.getUTCMinutes()); }
                function errorCn(e){
          var m = String(e||'');
          if (!m) return '—';
          var map = {
            'SUBFLOW_ERROR': '生成子流程执行失败（商品资料不全或词库数据缺失，请编辑补全后重提）',
            'CERTIFICATE_FAIL': '质量检查未通过（去 4.3 看具体哪项不通过）',
            'semantic.A2.1': '产品识别失败（未识别出商品实体，请检查商品图片是否清晰）',
            'A2.5': '禁用词检查未通过（标题/卖点出现了禁词）',
            'FAIL_MIXED_MARKET': '批次混了多个市场，请分市场提交',
            'TIMEOUT': '生成超时（图片太大或网络慢，重试一次）',
            'VALIDATION_ERROR': '参数校验失败（必填项缺失，请编辑补全）',
            'NOT_FOUND': '记录不存在（可能已被删除或清理）',
            'CONCURRENT_MODIFICATION': '记录被其他流程修改，状态冲突（重试一次）'
          };
          for (var k in map){ if (m.indexOf(k) >= 0) return map[k]; }
          return m;
        }
        if (!failed.length){ root.innerHTML = callout('warn','暂无数据','当前没有失败的任务。'); return; }
        root.innerHTML =
          panel('失败 / 需人工任务（共 ' + failed.length + ' 条）', pagedTable(
            ['图片','SKU','产品族','站点','错误信息','处理时间',''],
            failed.map(function(x){ return [
              thumbHtml(x['产品图片URL']),
              '<span class="m">' + (x['SKU']||'—') + '</span>',
              x['产品族ID']||'—',
              x['目标市场']||'—',
              '<span style="font-size:12px">' + errorCn(x['错误信息']) + '</span>',
              '<span class="m">' + bjTime(x['处理时间']) + '</span>',
              btn('编辑并重新提交', '', 'gen-new', (x['SKU']||''))
            ]; })
          ), {flush:true, note:'失败的按原因归类后<b>批量重跑</b>。每个字段最多重做 3 次，超限自动转人工。'});
      });
    }, 0);
    return el;
  }
});
