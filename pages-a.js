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
        function statusRank(s){ var u = String(s||'').toUpperCase(); return u==='REVIEW_REQUIRED'?0:(u==='PROCESSING'?1:(u==='PENDING'?2:(u==='COMPLETED'?3:(u==='FAILED'?4:5)))); }
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
              chip(x['处理状态']||'', st==='COMPLETED'?'ok':(st==='FAILED'?'fail':(st==='PROCESSING'?'run':''))),
              String(x['更新时间']||'').slice(0,16).replace('T',' '),
              btn(actionTxt, btnCls||'', go, sku)
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
        function statusRank(s){ var u = String(s||'').toUpperCase(); return u==='REVIEW_REQUIRED'?0:(u==='PROCESSING'?1:(u==='PENDING'?2:(u==='COMPLETED'?3:(u==='FAILED'?4:5)))); }
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
        function statusRank(s){ var u = String(s||'').toUpperCase(); return u==='REVIEW_REQUIRED'?0:(u==='PROCESSING'?1:(u==='PENDING'?2:(u==='COMPLETED'?3:(u==='FAILED'?4:5)))); }
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
            chip(x['处理状态']||'待处理', toneOf(x['处理状态'])),
            (x['处理时间']||'—').slice(0,10),
            btn('详情', '', 'sku-dna', (x.SKU||''))
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
    function skuFormHtml(){
      return '<div class="form g2">' +
        fld('SKU 编号 <span style="color:var(--red)">*</span>', '<input id="nsku-sku" class="ctl" placeholder="如 PILLOW-FLORAL-18X18">', '商品唯一编号，保存时会自动检查是否重复') +
        fld('商品是什么（英文核心词）<span style="color:var(--red)">*</span>', '<input id="nsku-entity" class="ctl" placeholder="如 pillow covers">', '写进标题的第一个词，比如 pillow covers') +
        fld('尺寸 <span style="color:var(--red)">*</span>', '<select id="nsku-dimensions" class="ctl"><option>16x16 inch</option><option>18x18 inch</option><option>20x20 inch</option><option>24x24 inch</option><option>26x26 inch</option></select>') +
        fld('数量 <span style="color:var(--red)">*</span>', '<input id="nsku-quantity" class="ctl" placeholder="如 set of 2">', '一套几个，比如 set of 2') +
        fld('变体（产品族）', '<select id="nsku-family" class="ctl"><option>无（独立商品）</option></select>', '归入已有系列，可选') +
        fld('类目', '<select id="nsku-category" class="ctl"><option>抱枕（Home Décor > Decorative Pillows）</option><option>桌旗（Kitchen & Dining > Table Runners）</option><option>婴童床笠（Nursery > Crib Sheets）</option></select>') +
        fld('季节范围', '<select id="nsku-season" class="ctl"><option>四季通用</option><option>春夏</option><option>秋冬</option><option>圣诞节</option><option>感恩节</option></select>') +
        fld('目标市场', '<select id="nsku-market" class="ctl"><option>US</option><option>GB</option><option>FR</option><option>IT</option><option>ES</option></select>') +
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
    function submitNewSku(){
      function val(id){ return (document.getElementById(id)||{}).value || ''; }
      var required = [['nsku-sku','SKU 编号'],['nsku-entity','商品是什么'],['nsku-dimensions','尺寸'],['nsku-quantity','数量']];
      var missing = required.filter(function(x){ return !val(x[0]); });
      if (missing.length > 0){ toast('还缺必填项：' + missing.map(function(x){return x[1];}).join('、')); return; }
      var sku = val('nsku-sku');
      API.table('SKU_输入表', {SKU: sku}, 1).then(function(r){
        var rows = (r.ok && r.data && r.data.data) ? r.data.data : [];
        var exists = rows.some(function(x){ return x['SKU'] === sku; });
        if (exists){ toast('SKU ' + sku + ' 已经存在，请换一个编号'); return; }
        var body = {
          sku: sku, marketplace: val('nsku-market') || 'US',
          category: val('nsku-category'), season_scope: val('nsku-season'),
          family_id: val('nsku-family'),
          brand_name: val('nsku-brand'), product_image_url: val('nsku-image'),
          product_entity: val('nsku-entity'), dimensions: val('nsku-dimensions'),
          quantity: val('nsku-quantity'), material: val('nsku-material'),
          craft: val('nsku-craft'), structure: val('nsku-structure'),
          function: val('nsku-function'), inclusion: val('nsku-inclusion'),
          care: val('nsku-care'), certification: val('nsku-certification'),
          prohibited_claims: val('nsku-prohibited')
        };
        API.create(body).then(function(r2){
          if (r2.ok && r2.data && r2.data.success){
            toast('已保存商品 ' + sku + '，可去「新建生成任务」生成文案');
            var vd = document.getElementById('view-dna-btn'); if (vd){ vd.style.display = 'inline-block'; vd.onclick = function(){ location.hash = 'sku-dna/' + sku; }; }
            var gg = document.getElementById('go-gen-btn'); if (gg){ gg.style.display = 'inline-block'; gg.onclick = function(){ location.hash = 'gen-new'; }; }
            ['nsku-sku','nsku-entity','nsku-quantity','nsku-brand','nsku-image','nsku-material','nsku-craft','nsku-structure','nsku-function','nsku-inclusion','nsku-care','nsku-certification','nsku-prohibited'].forEach(function(id){ var e = document.getElementById(id); if (e) e.value = ''; });
            var pr = document.getElementById('nsku-upload-progress'); if (pr) pr.textContent = '';
          }
          else { toast('保存失败：' + ((r2.data && r2.data.error) || '请检查网络')); }
        });
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
    var skuParam = pageParam();
    var formPart = '';
    if (!skuParam){
      formPart = panel('新增商品（保存后即可去「新建生成任务」生成文案）', skuFormHtml() + '<div style="margin-top:12px"><button class="btn" id="sku-save-btn" style="background:var(--g-600);color:#fff;border:none;font-weight:600">保存商品</button><button class="btn" id="view-dna-btn" style="display:none;margin-left:8px">查看识别结果</button><button class="btn" id="go-gen-btn" style="display:none;margin-left:8px">去生成文案</button></div>');
    }
    var el = formPart + '<div id="sku-detail-root">' + ghost('正在加载商品资料…') + '</div>';
    setTimeout(function(){
      if (!skuParam){
        var saveBtn = document.getElementById('sku-save-btn'); if (saveBtn) saveBtn.onclick = submitNewSku;
        bindSkuUpload();
        API.table('产品族', {}, 200).then(function(r){
          var famRows = (r.ok && r.data && r.data.data) ? r.data.data : [];
          var famSel = document.getElementById('nsku-family');
          if (famSel && famRows.length){
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
          ['产品族ID', input['产品族ID']||'—'],
          ['目标市场', input['目标市场']||'—'],
          ['类目', input['类目']||'—'],
          ['季节范围', input['季节范围']||'—'],
          ['品牌名', input['品牌名']||'—'],
          ['所属类目', input['所属类目']||'—'],
          ['处理状态', chip(input['处理状态']||'待处理', toneOf(input['处理状态']))],
          ['处理时间', String(input['处理时间']||'—').slice(0,16).replace('T',' ')],
          ['运行ID', input['运行ID']||'—'],
        ] : [];
        var imgHtml = (input && input['产品图片URL']) ? (input['产品图片URL'].indexOf('http') === 0 ? '<img src="'+input['产品图片URL']+'" style="width:160px;height:160px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:12px">' : '<div style="font-size:12px;color:var(--t-3);margin-bottom:12px">本地图片（尚未上传到云端）</div>') : '';
        var factPairs = fact ? [
          ['产品实体', fact['产品实体']||'—'],
          ['尺寸', fact['尺寸']||'—'],
          ['数量', fact['数量']||'—'],
          ['材质', fact['材质']||'—'],
          ['工艺', fact['工艺']||'—'],
          ['结构', fact['结构']||'—'],
          ['功能', fact['功能']||'（留空 = 不许说这类功能）'],
          ['包含物', fact['包含物']||'—'],
          ['护理', fact['护理']||'—'],
          ['认证安全', fact['认证安全']||'—'],
          ['禁止声明', fact['禁止声明']||'—'],
          ['数据完整性', fact['数据完整性']||'—'],
        ] : [];
        root.innerHTML =
          '<div class="cols c21">' +
          panel('商品资料 · ' + skuName, imgHtml + (leftPairs.length ? kv(leftPairs) : callout('warn','暂无资料','该 SKU 还没有输入资料。'))) +
          panel('商品事实（Product Truth）', (factPairs.length ? kv(factPairs) : callout('warn','暂无事实','该 SKU 还没有商品事实记录。')) + (fact && fact['缺失字段清单'] ? '<div style="margin-top:12px">' + callout('warn','缺失字段', fact['缺失字段清单']) + '</div>' : '')) +
          '</div>';
      });
    }, 0);
    return el;
  }
});

page('sku-family', {
  roles:['运营','管理员'],
  guide:[
    '同一系列的商品<b>共享图案、材质、风格</b>，各自<b>独享尺寸、数量</b>。',
    '不要为了让文案看起来不一样，就去改主图案或主风格——<b>每个商品写到最好就行，相似是允许的</b>。',
    '注意「季节混装」告警：同图案的四季款和圣诞款建在一个系列里，容易串词。'
  ],
  spec:{
    q:'哪些商品属于同一系列？共享什么、各自独享什么。',
    acts:['建系列','移入/移出','看系列内差异'],
    wf:['无'],
    reads:['product_family','sku','fact_registry'],
    writes:['product_family','sku.product_family_id'],
    limits:[
      '禁止为制造差异改主风格 / 主节日 / 主图案（F4.10 Family Router）',
      '同系列不同尺寸文案<b>允许高度相似</b>，单个商品最优优先',
      '系列只保证同款不串，<b>不保证季节不串</b>——季节靠「季节款式」字段'
    ]
  },
    body:function(){
    function toneOf(st){ var s = String(st||'').toUpperCase(); if (s==='COMPLETED') return 'ok'; if (s==='FAILED') return 'fail'; if (s==='PROCESSING') return 'run'; if (s==='REVIEW_REQUIRED') return 'warn'; return 'neutral'; }
    function openNewFamilyModal(){
      var html = '<div class="form g2">' +
        fld('变体编号（产品族ID）<span style="color:var(--red)">*</span>', '<input id="nfam-id" class="ctl" placeholder="如 FLORAL-SERIES-01">', '这个变体的唯一编号，新增商品时用它来归入') +
        fld('共享图案', '<input id="nfam-pattern" class="ctl" placeholder="如 floral print">') +
        fld('共享材质', '<input id="nfam-material" class="ctl" placeholder="如 faux linen">') +
        fld('共享风格', '<input id="nfam-style" class="ctl" placeholder="如 modern farmhouse">') +
        '</div>';
      openModal('新增变体（先建变体，再去「商品资料填写」把商品归入）', html, function(close){
        var fid = (document.getElementById('nfam-id')||{}).value || '';
        if (!fid){ toast('请填写变体编号'); return; }
        API.createFamily({ family_id: fid, shared_pattern: (document.getElementById('nfam-pattern')||{}).value || '', shared_material: (document.getElementById('nfam-material')||{}).value || '', shared_style: (document.getElementById('nfam-style')||{}).value || '' }).then(function(r){
          if (r.ok && r.data && r.data.success){ toast('变体 ' + fid + ' 已创建'); close(); }
          else { toast('创建失败：' + ((r.data && r.data.error) || '请检查网络')); }
        });
      }, '创建');
    }
    var el = toolbar([], ['<button class="btn" id="fam-new-btn" style="background:var(--g-600);color:#fff;border:none;font-weight:600">新增变体</button>']) + '<div id="sku-family-root">' + ghost('正在加载系列数据…') + '</div>';
    setTimeout(function(){
      var nb = document.getElementById('fam-new-btn'); if (nb) nb.onclick = openNewFamilyModal;
      Promise.all([API.table('产品族', {}, 200), API.table('SKU_输入表', {}, 200)]).then(function(rs){
        var root = document.getElementById('sku-family-root');
        if (!root) return;
        for (var i=0;i<rs.length;i++){ if (!rs[i] || !rs[i].ok || !rs[i].data || rs[i].data.success === false){ root.innerHTML = callout('stop','数据加载失败',(rs[i]&&rs[i].data&&rs[i].data.error)||'请检查网络或稍后重试'); return; } }
        var famRows = (rs[0].data.data || []);
        var rows = (rs[1].data.data || []).filter(function(x){ return x && x['SKU']; });
        if (!rows.length && !famRows.length){ root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
                var byFamily = {};
        rows.forEach(function(x){ var fid = x['产品族ID'] || ''; if (!byFamily[fid]) byFamily[fid] = []; byFamily[fid].push(x); });
        var famList = famRows.map(function(f){
          var fid = f.family_id || '';
          return { fid: fid, pattern: f.shared_pattern, material: f.shared_material, style: f.shared_style, members: byFamily[fid] || [] };
        });
        var famIdSet = {};
        famRows.forEach(function(f){ if (f.family_id) famIdSet[f.family_id] = true; });
        var orphan = [];
        Object.keys(byFamily).forEach(function(fid){ if (!fid || !famIdSet[fid]){ orphan = orphan.concat(byFamily[fid]); } });
        function renderMembers(fam){
          var t = '变体 ' + fam.fid + ' 的商品（' + fam.members.length + ' 个）';
          if (!fam.members.length){ return panel(t, callout('warn','这个变体还没有商品','去「商品资料填写」新增商品时，把「产品族ID」填成 ' + fam.fid + ' 即可归入这个变体。'), {flush:true}); }
          return panel(t, table(
            ['图片','SKU','目标市场','类目','季节范围','处理状态',''],
            fam.members.map(function(m){ return [
              thumbHtml(m['产品图片URL']),
            '<span class="m">' + (m['SKU']||'—') + '</span>',
              m['目标市场']||'—',
              m['类目']||'—',
              m['季节范围']||'—',
              chip(m['处理状态']||'待处理', toneOf(m['处理状态'])),
              btn('详情', '', 'sku-dna', (m['SKU']||''))
            ]; })
          ), {flush:true});
        }
        var famListHtml = famList.length ? table(['变体编号','共享图案','共享材质','共享风格','商品数',''],
            famList.map(function(f, i){ return [
              '<span class="m">' + f.fid + '</span>',
              f.pattern || '—',
              f.material || '—',
              f.style || '—',
              '<b>' + f.members.length + '</b>',
              '<button class="btn btn--ghost" data-famx="'+i+'">展开看商品</button>'
            ]; })
          ) : callout('warn','还没有变体','点右上角「新增变体」创建第一个变体。');
        var html = panel('变体清单（共 ' + famList.length + ' 个）', famListHtml, {flush:true, note:'同一变体共享图案/材质/风格，各自独享尺寸/数量。点「展开看商品」查看该变体下的所有商品。'});
        if (orphan.length){
          html += panel('未归入变体的商品（共 ' + orphan.length + ' 个）', table(['图片','SKU','目标市场','类目','季节范围','处理状态',''], orphan.map(function(m){ return [
            thumbHtml(m['产品图片URL']),
            '<span class="m">' + (m['SKU']||'—') + '</span>',
            m['目标市场']||'—',
            m['类目']||'—',
            m['季节范围']||'—',
            chip(m['处理状态']||'待处理', toneOf(m['处理状态'])),
            btn('详情', '', 'sku-dna', (m['SKU']||''))
          ]; })), {flush:true, note:'这些商品没填「产品族ID」，去「商品资料填写」补上即可归入对应变体。'});
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
        html += '<div id="fam-members">' + (fams.length ? renderMembers(fams[0]) : '') + '</div>';
        root.innerHTML = html;
        Array.prototype.forEach.call(document.querySelectorAll('.btn[data-fidx]'), function(el){
          el.onclick = function(){
            var i = parseInt(el.getAttribute('data-fidx'), 10);
            var fam = fams[i];
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
    var sku = pageParam();
    var el = '<div id="sku-dna-root">' + ghost('正在加载系统识别结果…') + '</div>';
    setTimeout(function(){
      API.table('产品识别结果', sku ? {SKU: sku} : {}, 200).then(function(r){
        var root = document.getElementById('sku-dna-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['SKU']; });
        if (!rows.length){ root.innerHTML = callout('warn','暂无识别结果','该商品还没有经过「产品识别」工作流。请先在「商品资料填写」补全资料并提交生成，系统会用 Gemini 识别产品图片、提炼精准卖点。'); return; }
        function safeParse(s){ if (!s) return null; if (typeof s === 'object') return s; try { return JSON.parse(s); } catch(e){ return null; } }
        var first = rows[0];
        var truth = safeParse(first['真相身份']) || {};
        var registry = safeParse(first['事实注册表']) || [];
        var visual = safeParse(first['视觉选择原型']) || {};
        function intentCn(it){ var m={'OUTDOOR_LIVING':'户外家居爱好者','PATIO_DECOR':'庭院/露台装饰需求者','CHRISTMAS_DECOR':'圣诞节日装饰','HOLIDAY_DECOR':'节日装饰','FARMHOUSE_STYLE':'乡村田园风爱好者','AUTUMN_DECOR':'秋季装饰','YEAR_ROUND_DECOR':'日常家居装饰','HALLOWEEN':'万圣节装饰','MINIMALIST':'简约风爱好者','SUMMER_OUTDOOR':'夏季户外','WINTER_COZY':'冬季温馨风','HOLIDAY_SPECIFIC':'节日限定'}; return m[it]||it; }
        var factVal = {};
        (registry||[]).forEach(function(f){ factVal[f.field] = f.value; });
        var primary = String(visual.primary||'');
        var pm = primary.match(/^([a-z]+) pattern/i);
        var patternText = pm ? pm[1] : (primary.indexOf('pattern')>=0 ? '特色图案' : '—');
        var sceneText = '—';
        (visual.secondary||[]).forEach(function(s2){ var m2 = String(s2).match(/staged scene: ([a-z]+)/i); if (m2) sceneText = m2[1]; });
        var sceneCn = ({outdoor:'户外（花园/露台/阳台）',garden:'花园',living:'客厅',bedroom:'卧室',office:'办公室',patio:'露台',porch:'门廊'})[sceneText] || (sceneText==='—'?'—':sceneText);
        var seasonScope = String(first['季节范围']||'');
        var seasonCn = ({'SPRING_SUMMER':'春夏户外家纺','春夏':'春夏户外家纺','FALL':'秋冬装饰','秋冬':'秋冬装饰','ALL_SEASON':'全年通用'})[seasonScope] || '待补充';
        var intents = (visual.compatible_intents||[]).map(intentCn);
        var identityHtml = panel('商品识别', kv([
          ['产品身份', truth.entity||'—'],
          ['SKU', first['SKU']||'—'],
          ['识别模型', first['识别模型']||'—'],
          ['识别时间', String(first['识别时间']||'—').slice(0,16).replace('T',' ')],
        ]));
        var peopleHtml = panel('人群定位', kv([
          ['目标人群', intents.length ? intents.join('、') : '—'],
          ['市场方向', seasonCn],
        ]));
        var sceneHtml = panel('使用场景', kv([
          ['主要场景', sceneCn],
          ['功能用途', factVal['function'] || '—'],
        ]));
        var styleHtml = panel('图案风格', kv([
          ['图案', patternText==='—' ? '—' : patternText + ' 图案'],
          ['工艺', factVal['craft'] || '—'],
          ['结构', factVal['structure'] || '—'],
        ]));
        var sellingHtml = panel('精准卖点', (visual.primary) ? kv([
          ['主卖点', visual.primary],
          ['次要卖点', (visual.secondary||[]).length ? visual.secondary.join('；') : '—'],
          ['卖点置信度', visual.confidence||'—'],
        ]) : callout('warn','暂无视觉卖点','产品图片缺失或识别降级，视觉卖点未生成。请先在「商品资料填写」补传产品图片。'));
        var chips = [];
        [['尺寸',factVal['size']],['材质',factVal['material']],['数量',factVal['quantity']],['包含',factVal['inclusion']],['护理',factVal['care']]].forEach(function(p){ if (p[1]) chips.push('<span style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;padding:4px 12px;font-size:12px;margin:3px">'+p[0]+'：'+p[1]+'</span>'); });
        var factHtml = panel('关键事实', chips.length ? '<div>'+chips.join('')+'</div>' : '—');
        root.innerHTML = '<div class="cols c2">' + identityHtml + peopleHtml + '</div><div class="cols c2">' + sceneHtml + styleHtml + '</div>' + sellingHtml + factHtml;
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
    var html = '<div class="cols c21">' +
      panel('选择商品与站点', '<div class="form g2">'+
        fld('选择商品 <span style="color:var(--red)">*</span>', '<select id="gen-sku" class="ctl"><option>正在加载商品…</option></select>', '只显示还没生成文案的商品，按 SKU 排序；已生成过的不会出现在这里') +
        fld('目标市场', '<select id="gen-market" class="ctl"><option>US</option><option>GB</option><option>FR</option><option>IT</option><option>ES</option></select>') +
        fld('文案语言', '<select id="gen-lang" class="ctl"><option value="en-US">英文</option><option value="en-GB">英文(英式)</option><option value="de-DE">德文</option><option value="fr-FR">法文</option><option value="it-IT">意大利文</option><option value="es-ES">西班牙文</option></select>', '选择文案语言') +
      '</div>' +
      '<div class="btnrow" style="margin-top:16px">' +
        '<button class="btn" id="gen-submit" style="background:var(--g-600);color:#fff;border:none;padding:9px 18px;border-radius:var(--r-ctl);font-weight:600;cursor:pointer">提交生成</button>' +
      '</div>' +
      '<div id="gen-result" style="margin-top:12px"></div>') +
    '</div>';

    setTimeout(function(){
            var skuRows = [];
            var marketSel = document.getElementById('gen-market');
      var langSel = document.getElementById('gen-lang');
      var skuSel = document.getElementById('gen-sku');
      marketSel.onchange = function(){ var lmap = {US:'en-US', GB:'en-GB', FR:'fr-FR', IT:'it-IT', ES:'es-ES'}; if (langSel) langSel.value = lmap[marketSel.value] || 'en-US'; };
      Promise.all([API.skus({}), API.listings()]).then(function(rs){
        skuRows = (rs[0].ok && rs[0].data && rs[0].data.data) ? rs[0].data.data : [];
        var listingRows = (rs[1].ok && rs[1].data && rs[1].data.data) ? rs[1].data.data : [];
        var done = {};
        listingRows.forEach(function(x){ if (x['SKU']) done[x['SKU']] = 1; });
        var rows = skuRows.filter(function(x){ return x['记录ID'] && !done[x['SKU']]; });
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
        var body = { sku: sku, marketplace: val('gen-market') || 'US', category: skuInfo['类目'] || skuInfo['category'] || '', season_scope: skuInfo['季节范围'] || skuInfo['season_scope'] || '', brand_name: skuInfo['品牌名'] || skuInfo['brand_name'] || '', product_image_url: skuInfo['产品图片URL'] || skuInfo['product_image_url'] || '', locale: val('gen-lang') || '' };
        API.generate(body).then(function(r){
          btn.disabled = false; btn.textContent = '提交生成';
          if (r.ok && r.data && r.data.success) {
            result.innerHTML = callout('warn','已提交，正在生成','SKU '+r.data.sku+' 已进入生成队列，主编排后台生成（一般 12 分钟内），可在「生成进度」查看状态。');
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
        q.sort(function(a,b){ var pa=parseInt(a['优先级']||'0')||0, pb=parseInt(b['优先级']||'0')||0; if (pa!==pb) return pa-pb; return String(a['创建时间']||'').localeCompare(String(b['创建时间']||'')); });
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
      API.table('运行日志表', {}, 200).then(function(r){
        var root = document.getElementById('gen-run-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['运行ID']; });
        if (!rows.length){ root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        function t(st){ var s = String(st||'').toUpperCase(); if (s==='SUCCESS'||s==='COMPLETED') return 'ok'; if (s==='FAILED') return 'fail'; if (s==='REVIEW_REQUIRED') return 'warn'; return ''; }
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
            panel('12 步链路', phaseFlow([
              {no:'①', t:'资料与识别段', s:'工序 1-2', state:'done', steps:[['done','1. 商品事实录入','',''],['done','2. Product DNA 识别','','']]},
              {no:'②', t:'数据摄取与机会发现段', s:'工序 3-6', state:'done', steps:[['done','3. 卖家精灵数据','',''],['done','4. 12类分类','',''],['done','5. PPC/SQP 归因','',''],['done','6. Reverse ASIN','','']]},
              {no:'③', t:'生成与审核段', s:'工序 7-12', state:'done', steps:[['done','7. 字段路由','',''],['done','8. 四层入口组合','',''],['done','9. 仲裁顺序','',''],['done','10. 八项质量门禁','',''],['done','11. 审核放行','',''],['done','12. 上架登记','','']]},
            ]), {flush:true, note:'绿色步骤已完成。12 步状态由后端返回，当前为占位展示。'});
        } else {
        var succ = rows.filter(function(x){ return String(x['最终状态']||'').toUpperCase()==='SUCCESS'; }).length;
        var fail = rows.filter(function(x){ return String(x['最终状态']||'').toUpperCase()==='FAILED'; }).length;
        var revw = rows.filter(function(x){ return String(x['最终状态']||'').toUpperCase()==='REVIEW_REQUIRED'; }).length;
        function bjTime(t){ if(!t) return '—'; var d = new Date(t); if(isNaN(d.getTime())) return String(t).slice(0,16).replace('T',' '); var bj = new Date(d.getTime() + 8*3600*1000); var p = function(n){ return (n<10?'0':'')+n; }; return bj.getUTCFullYear()+'-'+p(bj.getUTCMonth()+1)+'-'+p(bj.getUTCDate())+' '+p(bj.getUTCHours())+':'+p(bj.getUTCMinutes()); }
        function statusRank(s){ var u = String(s||'').toUpperCase(); return u==='REVIEW_REQUIRED'?0:(u==='PROCESSING'?1:(u==='PENDING'?2:((u==='SUCCESS'||u==='COMPLETED')?3:(u==='FAILED'?4:5)))); }
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
              btn('详情', '', 'gen-run/' + (x['运行ID']||''), '')
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
        function bjTime(t){ if(!t) return '—'; var d = new Date(t); if(isNaN(d.getTime())) return String(t).slice(0,16).replace('T',' '); var bj = new Date(d.getTime() + 8*3600*1000); var p = function(n){ return (n<10?'0':'')+n; }; return bj.getUTCFullYear()+'-'+p(bj.getUTCMonth()+1)+'-'+p(bj.getUTCDate())+' '+p(bj.getUTCHours())+':'+p(bj.getUTCMinutes()); }
        if (!failed.length){ root.innerHTML = callout('warn','暂无数据','当前没有失败的任务。'); return; }
        root.innerHTML =
          panel('失败 / 需人工任务（共 ' + failed.length + ' 条）', pagedTable(
            ['图片','SKU','产品族','站点','错误信息','处理时间',''],
            failed.map(function(x){ return [
              thumbHtml(x['产品图片URL']),
              '<span class="m">' + (x['SKU']||'—') + '</span>',
              x['产品族ID']||'—',
              x['目标市场']||'—',
              x['错误信息']||'—',
              '<span class="m">' + bjTime(x['处理时间']) + '</span>',
              '<button class="btn btn--ghost" onclick="retrySku(\''+(x['SKU']||'')+'\')">重新提交</button>'
            ]; })
          ), {flush:true, note:'失败的按原因归类后<b>批量重跑</b>。每个字段最多重做 3 次，超限自动转人工。'});
      });
    }, 0);
    return el;
  }
});
