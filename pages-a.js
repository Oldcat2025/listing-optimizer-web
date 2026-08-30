/* ══ 页面组 ①工作台 ②我的商品 ③生成文案 ══ */

/* ───────── ① 工作台 ───────── */

page('dash-todo', {
  roles:['运营','审核','管理员'],
  guide:[
    '<b>先看上面的大数字</b>，知道今天整体有多少事。',
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
        function rowList(rows, actionTxt, btnCls){
          return rows.slice(0,20).map(function(x){
            var sku = x['SKU']||'';
            var st = String(x['处理状态']||'').toUpperCase();
            var go = (actionTxt === '去审核') ? 'rev-action'
                   : (st === 'COMPLETED') ? 'rev-detail'
                   : 'sku-detail';
            return [
              '<span class="m">'+sku+'</span>',
              x['目标市场']||'—',
              chip(x['处理状态']||'', st==='COMPLETED'?'ok':(st==='FAILED'?'fail':(st==='PROCESSING'?'run':''))),
              String(x['更新时间']||'').slice(0,16),
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
          panel('我的商品（'+skuRows.length+' 条）', table(['SKU','站点','状态','更新时间',''], rowList(skuRows,'详情')), {flush:true});
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
          panel('待审核商品（'+reviewRows.length+' 条）', table(['SKU','站点','状态','更新时间',''], rowList(reviewRows,'去审核','btn')), {flush:true});
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
          panel('全部任务（'+skuRows.length+' 条）', table(['SKU','站点','状态','更新时间',''], rowList(skuRows,'详情')), {flush:true});
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
    '上面四个数字是<b>此刻</b>的运行情况，不是今天累计。',
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
          panel('全部任务（' + rows.length + ' 条）', table(
            ['SKU','站点','状态','更新时间',''],
            rows.slice(0, 30).map(function(x){
              var sku = x['SKU']||'';
              var st = String(x['处理状态']||'').toUpperCase();
              return [
                '<span class="m">' + sku + '</span>',
                x['目标市场'] || '—',
                chip(x['处理状态']||'', tone(x['处理状态'])),
                '<span class="m">' + String(x['更新时间']||'').slice(0,16) + '</span>',
                btn('详情', '', (st === 'COMPLETED' ? 'rev-detail' : 'sku-detail'), sku)
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
          panel('未通过明细（全部通过 = 否）', failedRows.length ? table(
            ['SKU','站点','结论','生成时间',''],
            failedRows.slice(0, 30).map(function(x){ return [
              '<span class="m">' + (x['SKU']||'—') + '</span>',
              x['目标市场'] || '—',
              chip('未通过','fail'),
              '<span class="m">' + String(x['生成时间']||'').slice(0,16) + '</span>',
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
        API.table('站点词库_US', {}, 200),
        API.table('定稿输出表', {}, 200),
        API.table('证书表', {}, 200)
      ]).then(function(rs){
        var root = document.getElementById('dash-flow-root');
        if (!root) return;
        for (var i=0;i<rs.length;i++){ if (!rs[i] || !rs[i].ok || !rs[i].data || rs[i].data.success === false){ root.innerHTML = callout('stop','数据加载失败',(rs[i]&&rs[i].data&&rs[i].data.error)||'请检查网络或稍后重试'); return; } }
        function cnt(r, key){ if (r && r.data && r.data.total !== undefined && r.data.total !== null) return r.data.total; var rows = (r && r.data && r.data.data) || []; return rows.filter(function(x){ return x && x[key]; }).length; }
        function fmt(n){ n = Number(n || 0); try { return n.toLocaleString(); } catch(e){ return String(n); } }
        var skuN = cnt(rs[0], 'SKU'), kwN = cnt(rs[1], '关键词'), finN = cnt(rs[2], 'SKU'), certN = cnt(rs[3], '运行ID');
        root.innerHTML =
          stats([
            ['商品累计', fmt(skuN), 'SKU_输入表', '', false],
            ['关键词累计', fmt(kwN), '站点词库_US', 'ok', false],
            ['定稿累计', fmt(finN), '定稿输出表', '', false],
            ['证书累计', fmt(certN), '证书表', 'ok', false],
          ], 4) +
          panel('四道工序的数据底子（系统启用以来的累计值）', kv([
            ['① 收商品资料 · SKU_输入表', fmt(skuN) + ' 条'],
            ['② 处理关键词表 · 站点词库_US', fmt(kwN) + ' 行'],
            ['③ 出定稿文案 · 定稿输出表', fmt(finN) + ' 套'],
            ['④ 出检查报告 · 证书表', fmt(certN) + ' 份'],
          ]), {flush:true, note:'这四个数字就是系统「越用越好」的底子：<b>每一次生成都往这些表里沉淀记录</b>。数据越多，词评级、意图标注和参数版本越准。'});
      });
    }, 0);
    return el;
  }
});

page('sku-list', {
  roles:['运营','审核','管理员'],
  guide:[
    '「资料完整度」是能不能生成的<b>前提</b>——不是 11/11 就点不动生成。',
    '同一个图案的四季款和圣诞款<b>必须分开建</b>（看「季节款式」列），否则防水、户外这类说法会串到不该有的款上。',
    '要生成文案，先确认资料齐了，再去 ③ 新建生成任务。'
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
      [inp('搜索 SKU'), sel('全部状态',['待处理','生成中','待审核','需人工','已上架'])],
      [btn('批量导入','','','','','批量导入功能暂未开放'), btn('新建商品','btn','sku-detail')]
    ) + '<div id="sku-data" style="margin-top:14px">' + ghost('正在加载商品列表…') + '</div>';
    setTimeout(function(){
      API.skus({}).then(function(r){
        var el = document.getElementById('sku-data');
        if (!el) return;
        var rows = (r.ok && r.data && r.data.data) ? r.data.data : [];
        rows = rows.filter(function(x){ return x['记录ID']; });
        if (!rows.length){ el.innerHTML = callout('warn','还没有商品','点「新建商品」添加第一个 SKU。'); return; }
        var toneOf = function(st){
          if (st==='COMPLETED'||st==='completed') return 'ok';
          if (st==='pending'||st==='待处理') return 'neutral';
          if (st==='failed'||st==='失败') return 'fail';
          return 'run';
        };
        var tr = rows.map(function(x){
          return [
            '<span class="m">'+(x.SKU||'—')+'</span>',
            '<span class="m">'+(x['产品族ID']||'—')+'</span>',
            x['类目']||'—',
            x['季节范围']||'—',
            x['目标市场']||'—',
            chip(x['处理状态']||'待处理', toneOf(x['处理状态'])),
            (x['处理时间']||'—').slice(0,10),
            btn('详情', '', (String(x['处理状态']||'').toUpperCase()==='COMPLETED'?'rev-detail':'sku-detail'), (x.SKU||''))
          ];
        });
        el.innerHTML = table(['SKU','产品族','类目','季节范围','市场','状态','处理时间',''], tr);
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
    var el = '<div id="sku-detail-root">' + ghost('正在加载商品资料…') + '</div>';
    setTimeout(function(){
      var sku = pageParam();
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
          ['词库快照ID', input['词库快照ID']||'—'],
          ['处理状态', chip(input['处理状态']||'待处理', toneOf(input['处理状态']))],
          ['处理时间', String(input['处理时间']||'—').slice(0,16)],
          ['运行ID', input['运行ID']||'—'],
        ] : [];
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
          panel('商品资料 · ' + skuName, (leftPairs.length ? kv(leftPairs) : callout('warn','暂无资料','该 SKU 还没有输入资料。'))) +
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
    var el = '<div id="sku-family-root">' + ghost('正在加载系列数据…') + '</div>';
    setTimeout(function(){
      API.table('SKU_输入表', {}, 200).then(function(r){
        var root = document.getElementById('sku-family-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['SKU']; });
        if (!rows.length){ root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        var groups = {};
        rows.forEach(function(x){ var fid = x['产品族ID'] || '（未分组）'; if (!groups[fid]) groups[fid] = []; groups[fid].push(x); });
        var fams = Object.keys(groups).map(function(fid){
          var members = groups[fid];
          var seasons = {};
          members.forEach(function(m){ var s = m['季节范围']||'—'; seasons[s] = (seasons[s]||0) + 1; });
          return { fid: fid, members: members, seasonTxt: Object.keys(seasons).map(function(s){ return s + ' ×' + seasons[s]; }).join(' / '), markets: members.map(function(m){ return m['目标市场']||'—'; }).join(', ') };
        });
        function renderMembers(fam){
          return panel('系列内商品（' + fam.fid + '）', table(
            ['SKU','目标市场','类目','季节范围','处理状态',''],
            fam.members.map(function(m){ return [
              '<span class="m">' + (m['SKU']||'—') + '</span>',
              m['目标市场']||'—',
              m['类目']||'—',
              m['季节范围']||'—',
              chip(m['处理状态']||'待处理', toneOf(m['处理状态'])),
              btn('详情', '', (String(m['处理状态']||'').toUpperCase()==='COMPLETED'?'rev-detail':'sku-detail'), (m['SKU']||''))
            ]; })
          ), {flush:true});
        }
        var html = panel('系列（按产品族ID分组 · 共 ' + fams.length + ' 个）', table(
          ['系列编号','商品数','目标市场','季节款式分布',''],
          fams.map(function(f, i){ return [
            '<span class="m">' + f.fid + '</span>',
            f.members.length,
            f.markets,
            f.seasonTxt,
            '<button class="btn btn--ghost" data-fidx="'+i+'">展开</button>'
          ]; })
        ), {flush:true, note:'同一系列共享图案/材质/风格，各自独享尺寸/数量。<b>季节混装</b>（同一系列跨多个季节款式）容易串词，系统会二次校验拦截。'});
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
    '这一页是<b>系统看完你的资料和图片之后的理解</b>，只能看不能改。',
    '重点看「状态」列：<b>已确认</b>=来自你填的资料；<b>推断</b>=系统看图猜的；<b>不确定</b>=没人知道。',
    '如果系统理解错了，回 2.2 改资料再重新生成——不要试图在这一页改。'
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
    var el = '<div id="sku-dna-root">' + ghost('正在加载系统识别结果…') + '</div>';
    setTimeout(function(){
      API.table('商品事实表', {}, 200).then(function(r){
        var root = document.getElementById('sku-dna-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['SKU']; });
        if (!rows.length){ root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        function statusChip(x){
          var comp = String(x['数据完整性']||'').toUpperCase();
          if (comp === 'COMPLETE') return chip('已确认','ok');
          if (comp === 'INCOMPLETE') return chip('不完整','warn');
          if (comp === 'REJECTED') return chip('已拒绝','fail');
          return chip('待定','neutral');
        }
        var first = rows[0];
        root.innerHTML =
          '<div class="cols c2">' +
          panel('系统认定的商品身份', kv([
            ['SKU', first['SKU']||'—'],
            ['产品实体', first['产品实体']||'—'],
            ['尺寸', first['尺寸']||'—'],
            ['数量', first['数量']||'—'],
            ['包含物', first['包含物']||'—'],
            ['数据完整性', statusChip(first)],
          ])) +
          panel('这份事实的约束', kv([
            ['材质', first['材质']||'—'],
            ['工艺', first['工艺']||'—'],
            ['结构', first['结构']||'—'],
            ['功能', first['功能']||'（留空 = 不许说）'],
            ['护理', first['护理']||'—'],
            ['认证安全', first['认证安全']||'—'],
            ['禁止声明', first['禁止声明']||'—'],
          ])) +
          '</div>' +
          panel('逐条事实（商品事实表 · 共 ' + rows.length + ' 条）', table(
            ['SKU','产品实体','尺寸','数量','材质','工艺','结构','功能','数据完整性'],
            rows.slice(0, 30).map(function(x){ return [
              '<span class="m">' + (x['SKU']||'—') + '</span>',
              x['产品实体']||'—',
              x['尺寸']||'—',
              x['数量']||'—',
              x['材质']||'—',
              x['工艺']||'—',
              x['结构']||'—',
              x['功能']||'—',
              statusChip(x),
            ]; })
          ), {flush:true, note:'<b>「数据完整性」由系统判定</b>：COMPLETE=资料齐全，INCOMPLETE=有必填缺失，REJECTED=禁止声明或必填冲突。材质/工艺来自商品事实表，图片不能替代它。'});
      });
    }, 0);
    return el;
  }
});

/* ───────── ③ 生成文案 ───────── */

page('gen-new', {
  roles:['运营','审核','管理员'],
  guide:[
    '选商品 → 选站点 → 点「先检查一下」。',
    '<b>检查不通过就别提交</b>，下面会明确告诉你缺什么。',
    '右边那一栏是这次生成会用到的<b>数据和设置版本</b>，会被锁死——之后别人改了设置也不影响这次结果。'
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
      panel('商品信息', '<div class="form g2">'+
        fld('SKU 编号 <span style="color:var(--red)">*</span>', '<input id="gen-sku" class="ctl" placeholder="如 PILLOW-FLORAL-18X18">', '商品唯一编号') +
        fld('目标市场', '<select id="gen-market" class="ctl"><option>US</option><option>GB</option></select>') +
        fld('类目', '<input id="gen-category" class="ctl" placeholder="Home & Kitchen > Home Décor > Decorative Pillows">') +
        fld('季节范围', '<input id="gen-season" class="ctl" placeholder="All-Season / Christmas">') +
        fld('品牌名', '<input id="gen-brand" class="ctl" placeholder="HomGoodz">') +
        fld('产品图片URL', '<input id="gen-image" class="ctl" placeholder="谷歌网盘图片的 Drive alt=media URL">') +
        fld('词库快照ID', '<input id="gen-kw" class="ctl" placeholder="KDB-US-ALL_SEASON-20260825">') +
      '</div>') +
      panel('商品事实（9 项必填，ProductDNA 以此为准）', '<div class="form g2">'+
        fld('产品实体 <span style="color:var(--red)">*</span>', '<input id="gen-entity" class="ctl" placeholder="如 pillow covers">') +
        fld('尺寸 <span style="color:var(--red)">*</span>', '<input id="gen-dimensions" class="ctl" placeholder="如 18x18 inch">') +
        fld('数量 <span style="color:var(--red)">*</span>', '<input id="gen-quantity" class="ctl" placeholder="如 set of 2">') +
        fld('材质 <span style="color:var(--red)">*</span>', '<input id="gen-material" class="ctl" placeholder="如 faux linen">') +
        fld('工艺 <span style="color:var(--red)">*</span>', '<input id="gen-craft" class="ctl" placeholder="如 printed pattern, floral">') +
        fld('结构 <span style="color:var(--red)">*</span>', '<input id="gen-structure" class="ctl" placeholder="如 hidden zipper">') +
        fld('功能 <span style="color:var(--red)">*</span>', '<input id="gen-function" class="ctl" placeholder="如 waterproof, decorative">') +
        fld('包含物 <span style="color:var(--red)">*</span>', '<input id="gen-inclusion" class="ctl" placeholder="如 covers only, inserts not included">') +
        fld('护理 <span style="color:var(--red)">*</span>', '<input id="gen-care" class="ctl" placeholder="如 machine washable">') +
        fld('认证安全', '<input id="gen-certification" class="ctl" placeholder="可选，如 OEKO-TEX">') +
        fld('禁止声明', '<input id="gen-prohibited" class="ctl" placeholder="可选，如 waterproof">') +
      '</div>' +
      '<div class="btnrow" style="margin-top:16px">' +
        '<button class="btn" id="gen-submit" style="background:var(--g-600);color:#fff;border:none;padding:9px 18px;border-radius:var(--r-ctl);font-weight:600;cursor:pointer">提交生成</button>' +
      '</div>' +
      '<div id="gen-result" style="margin-top:12px"></div>') +
    '</div>';

    setTimeout(function(){
      var btn = document.getElementById('gen-submit');
      if (btn) btn.onclick = function(){
        function val(id){ return (document.getElementById(id)||{}).value || ''; }
        var sku = val('gen-sku');
        var result = document.getElementById('gen-result');
        var required = [['gen-sku','SKU 编号'],['gen-entity','产品实体'],['gen-dimensions','尺寸'],['gen-quantity','数量'],['gen-material','材质'],['gen-craft','工艺'],['gen-structure','结构'],['gen-function','功能'],['gen-inclusion','包含物'],['gen-care','护理']];
        var missing = required.filter(function(x){ return !val(x[0]); });
        if (missing.length > 0) {
          result.innerHTML = callout('warn','还缺必填项', missing.map(function(x){return x[1];}).join('、') + ' 还没填。');
          return;
        }
        btn.disabled = true; btn.textContent = '提交中…';
        var body = {
          sku: sku,
          marketplace: val('gen-market') || 'US',
          category: val('gen-category'),
          season_scope: val('gen-season'),
          brand_name: val('gen-brand'),
          product_image_url: val('gen-image'),
          keyword_snapshot_id: val('gen-kw'),
          product_entity: val('gen-entity'),
          dimensions: val('gen-dimensions'),
          quantity: val('gen-quantity'),
          material: val('gen-material'),
          craft: val('gen-craft'),
          structure: val('gen-structure'),
          function: val('gen-function'),
          inclusion: val('gen-inclusion'),
          care: val('gen-care'),
          certification: val('gen-certification'),
          prohibited_claims: val('gen-prohibited')
        };
        API.generate(body).then(function(r){
          btn.disabled = false; btn.textContent = '提交生成';
          if (r.ok && r.data && r.data.success) {
            result.innerHTML = callout('warn','已提交，正在生成','SKU '+r.data.sku+' 已进入生成队列，主编排后台生成（一般 12 分钟内），可在「我的商品」查看状态。');
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
    var el = '<div id="gen-queue-root">' + ghost('正在加载排队情况…') + '</div>';
    setTimeout(function(){
      API.table('SKU_输入表', {}, 200).then(function(r){
        var root = document.getElementById('gen-queue-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['SKU']; });
        var q = rows.filter(function(x){ var s = String(x['处理状态']||'').toUpperCase(); return s === 'PENDING' || s === 'PROCESSING'; });
        if (!q.length){ root.innerHTML = callout('warn','暂无数据','当前没有排队中或处理中的任务。'); return; }
        var running = q.filter(function(x){ return String(x['处理状态']||'').toUpperCase() === 'PROCESSING'; }).length;
        var pending = q.length - running;
        root.innerHTML =
          stats([
            ['处理中', running, 'PROCESSING', 'run', false],
            ['排队等待', pending, 'PENDING', '', false],
          ], 2) +
          panel('队列（' + q.length + ' 条）', table(
            ['SKU','产品族','站点','处理状态','更新时间',''],
            q.slice(0, 30).map(function(x){ return [
              '<span class="m">' + (x['SKU']||'—') + '</span>',
              x['产品族ID']||'—',
              x['目标市场']||'—',
              chip(x['处理状态']||'', toneOf(x['处理状态'])),
              '<span class="m">' + String(x['更新时间']||'').slice(0,16) + '</span>',
              btn('取消','btn--danger','','','','取消任务功能暂未开放')
            ]; })
          ), {flush:true});
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
    var el = '<div id="gen-run-root">' + ghost('正在加载运行详情…') + '</div>';
    setTimeout(function(){
      API.table('运行日志表', {}, 200).then(function(r){
        var root = document.getElementById('gen-run-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['运行ID']; });
        if (!rows.length){ root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        function t(st){ var s = String(st||'').toUpperCase(); if (s==='SUCCESS'||s==='COMPLETED') return 'ok'; if (s==='FAILED') return 'fail'; if (s==='REVIEW_REQUIRED') return 'warn'; return ''; }
        var succ = rows.filter(function(x){ return String(x['最终状态']||'').toUpperCase()==='SUCCESS'; }).length;
        var fail = rows.filter(function(x){ return String(x['最终状态']||'').toUpperCase()==='FAILED'; }).length;
        var revw = rows.filter(function(x){ return String(x['最终状态']||'').toUpperCase()==='REVIEW_REQUIRED'; }).length;
        root.innerHTML =
          stats([
            ['运行总数', rows.length, '运行日志表', '', false],
            ['成功', succ, '', 'ok', false],
            ['失败', fail, '', 'fail', false],
            ['需人工', revw, '', 'warn', false],
          ], 4) +
          panel('运行列表（' + rows.length + ' 条）', table(
            ['运行ID','SKU','站点','耗时(秒)','最终状态','开始时间',''],
            rows.slice(0, 30).map(function(x){ return [
              '<span class="m">' + (x['运行ID']||'—') + '</span>',
              x['SKU']||'—',
              x['目标市场']||'—',
              x['耗时秒']||'—',
              chip(x['最终状态']||'', t(x['最终状态'])),
              '<span class="m">' + String(x['开始时间']||'').slice(0,16) + '</span>',
              btn('详情', '', 'rev-detail', (x['SKU']||''))
            ]; })
          ), {flush:true});
      });
    }, 0);
    return el;
  }
});

page('gen-retry', {
  roles:['运营','审核','管理员'],
  guide:[
    '哪个字段失败就<b>只重做那个字段</b>，已经写好的不会被推翻重来。',
    '每个字段<b>最多重做 3 次</b>，超过就自动转人工——这是防止无限试错烧钱。',
    '怎么修不用你想，系统按固定规则给出修复动作。'
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
    var el = '<div id="gen-retry-root">' + ghost('正在加载失败任务…') + '</div>';
    setTimeout(function(){
      API.table('SKU_输入表', {}, 200).then(function(r){
        var root = document.getElementById('gen-retry-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data || []).filter(function(x){ return x && x['SKU']; });
        var failed = rows.filter(function(x){ return String(x['处理状态']||'').toUpperCase() === 'FAILED'; });
        if (!failed.length){ root.innerHTML = callout('warn','暂无数据','当前没有失败的任务。'); return; }
        root.innerHTML =
          panel('失败任务（处理状态 = FAILED · 共 ' + failed.length + ' 条）', table(
            ['SKU','产品族','站点','错误信息','处理时间',''],
            failed.slice(0, 30).map(function(x){ return [
              '<span class="m">' + (x['SKU']||'—') + '</span>',
              x['产品族ID']||'—',
              x['目标市场']||'—',
              x['错误信息']||'—',
              '<span class="m">' + String(x['处理时间']||'').slice(0,16) + '</span>',
              btn('重做','btn','','','','重做功能暂未开放')
            ]; })
          ), {flush:true, note:'失败的按原因归类后<b>批量重跑</b>。每个字段最多重做 3 次，超限自动转人工。'});
      });
    }, 0);
    return el;
  }
});
