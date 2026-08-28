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
    var statBar = '<div id="dash-stats" style="margin-bottom:14px">' + ghost('正在加载统计…') + '</div>';
    setTimeout(function(){
      API.stats().then(function(r){
        var el = document.getElementById('dash-stats');
        if (!el) return;
        if (r.ok && r.data) {
          var d = r.data;
          el.innerHTML = stats([
            ['待处理', d.pending||0, '待生成', 'neutral', false],
            ['生成中', d.running||0, '', '', false],
            ['待审核', d.review||0, '', 'run', false],
            ['已完成', d.completed||0, '', 'ok', false],
            ['失败', d.failed||0, '', 'fail', false],
          ], 5);
        } else { el.innerHTML = ''; }
      });
    }, 0);

    if (R === '运营'){
      return statBar + stats([
        ['等我补资料','3','缺必填项，卡住不能生成','fail',false],
        ['正在生成','4','预计 12 分钟内出结果','',false],
        ['可以复制上架','7','已通过全部检查','ok',false],
        ['等我登记 ASIN','2','上架后回来登记','warn',false],
      ],4) +

      panel('你的完整流程', flow([
        {t:'填商品资料', s:'把商品是什么、多大、几个装写清楚', n:3, tone:'fail', go:'sku-list'},
        {t:'提交生成',   s:'选好站点，点提交',                 n:0,               go:'gen-new'},
        {t:'等系统生成', s:'一般 12 分钟内，可以去干别的',       n:4,               go:'dash-runs'},
        {t:'复制上架',   s:'四段文案直接复制到亚马逊后台',       n:7, tone:'ok',   go:'rev-list'},
        {t:'登记 ASIN',  s:'上架后填个 ASIN，系统才能跟踪效果',  n:2, tone:'warn', go:'fb-publish'},
      ]), {sub:'点任意环节直接跳过去处理', flush:false,
        note:'流程图上的数字就是<b>卡在那一步、等你处理</b>的数量。数字是 0 说明这一步现在不用你管。'}) +

      panel('轮到你处理的', table(
        ['要做什么','商品','站点','为什么卡住','等了多久',''],
        [
          [chip('补资料','fail'),'<span class="m">FX-07</span>','—','「包含物」没填（要写清含不含内芯）','<span class="m">3 小时</span>',btn('去补','btn')],
          [chip('补资料','fail'),'<span class="m">FX-09</span>','—','婴儿类必须填「认证/安全」','<span class="m">1 天</span>',btn('去补')],
          [chip('可复制','ok'),'<span class="m">FX-03</span>','US','已全部通过检查','<span class="m">42 分钟</span>',btn('去复制','btn')],
          [chip('可复制','ok'),'<span class="m">FX-03</span>','GB','已通过（后台关键词偏短但已说明理由）','<span class="m">40 分钟</span>',btn('去复制')],
          [chip('登记','warn'),'<span class="m">FX-01</span>','US','上架后还没填 ASIN','<span class="m">2 天</span>',btn('去登记')],
        ]
      ), {flush:true});
    }

    if (R === '审核'){
      return statBar + stats([
        ['等我审核','7','已出检查报告','',false],
        ['其中一次通过','5','五项检查全绿','ok',false],
        ['有说明的通过','2','某项偏短但已证明合理','warn',false],
        ['需人工处理','2','系统已放弃自动修','fail',false],
      ],4) +

      panel('你的完整流程', flow([
        {t:'看待审文案', s:'系统只给一套定稿，不给你做选择题', n:7, tone:'ok', go:'rev-list'},
        {t:'看检查报告', s:'五项检查 + 每个词为什么进来',      n:7,             go:'rev-audit'},
        {t:'放行或打回', s:'打回时指定改哪个字段，不整篇重写',  n:7,             go:'rev-action'},
        {t:'处理疑难',   s:'系统修不了的，交给人判断',          n:2, tone:'fail', go:'rev-manual'},
      ]), {sub:'点任意环节直接跳过去处理',
        note:'<b>放行前建议先看检查报告</b>：报告里写清了每个词凭什么进这个字段、哪些词被拒绝以及原因。'}) +

      panel('等你放行的', table(
        ['商品','站点','五项检查','结论','等了多久',''],
        [
          ['<span class="m">FX-03</span>','US','5/5 '+chip('全通过','ok'),'可上架','<span class="m">42 分钟</span>',btn('去审核','btn')],
          ['<span class="m">FX-03</span>','GB','4/5 '+chip('1 项偏短','warn'),'可上架（有说明）','<span class="m">40 分钟</span>',btn('去审核')],
          ['<span class="m">FX-05</span>','US','0/5 '+chip('未出','fail'),'需人工','<span class="m">18 小时</span>',btn('去处理','btn--danger')],
        ]
      ), {flush:true});
    }

    /* 管理员（含数据维护） */
    return statBar + stats([
      ['数据该更新了','1','英国关键词已过 13 天','warn',false],
      ['规则超期','1','英国平台规则 97 天没复核','fail',false],
      ['正在运行','4','并发上限 3，有排队','',false],
      ['今日失败','5','3 条是数据问题，2 条是准入','fail',false],
    ],4) +

    panel('你的完整流程', flow([
      {t:'导入数据',      s:'关键词表、广告、搜索表现',        n:1, tone:'warn', go:'data-kw'},
      {t:'维护规则与模型', s:'类目/站点规则、AI 指令、模型密钥', n:1, tone:'fail', go:'cfg-market'},
      {t:'看运行情况',    s:'谁在跑、跑到哪、排队多久',        n:4,              go:'dash-runs'},
      {t:'处理异常',      s:'失败的按原因归类，批量重跑',       n:5, tone:'fail', go:'gen-retry'},
      {t:'看用量与费用',  s:'离护栏还有多远',                  go:'adm-cost'},
    ]), {sub:'点任意环节直接跳过去处理',
      note:'管理员合并了原「数据维护」角色。<b>这意味着数据岗同时拿到了改模型密钥和用户权限的能力</b>——如果这两个岗不是同一个人，去 ⑧.1 打开「受限管理员」开关。'}) +

    panel('需要你处理的', table(
      ['类型','对象','说明','严重度',''],
      [
        [chip('规则超期','fail'),'<span class="m">英国站平台规则</span>','97 天没复核（超过 90 天阈值），提交生成时会告警','高',btn('去复核','btn')],
        [chip('数据到期','warn'),'<span class="m">英国站关键词表</span>','快照是 8-05 的，已过 13 天','中',btn('去导入')],
        [chip('失败','fail'),'<span class="m">FX-07 / FX-09</span>','商品资料必填项为空 —— 属输入问题，需通知运营','中',btn('通知运营')],
        [chip('失败','fail'),'<span class="m">FX-02</span>','关键词表没读完整（读到的行数 ≠ 表里的行数）','高',btn('重导数据','btn')],
        [chip('密钥','warn'),'<span class="m">云雾 API 旧密钥</span>','已失效（401），备用密钥可用，建议轮换','中',btn('去处理')],
      ]
    ), {flush:true});
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
    return stats([
      ['正在运行','4','',' ',false],
      ['排队等待','11','预计 1 小时 42 分清空','',false],
      ['今天完成','38','',' ok',false],
      ['今天失败','5','3 数据问题 / 2 准入问题','fail',false],
      ['平均耗时','9分12秒','目标 12 分钟内','ok',true],
    ],5) +

    panel('正在运行', table(
      ['任务编号','商品','站点','跑到哪一步','进度','已用时',''],
      [
        ['<span class="m">RUN-260818-0011</span>','FX-04','US','第二段 · 决定用哪些词',bar(58),'<span class="m">5分02秒</span>',btn('详情')],
        ['<span class="m">RUN-260818-0012</span>','FX-04','GB','第一段 · 判断买家意图',bar(41),'<span class="m">3分48秒</span>',btn('详情')],
        ['<span class="m">RUN-260818-0013</span>','FX-06','US','第一段 · 处理关键词表',bar(22),'<span class="m">1分30秒</span>',btn('详情')],
        ['<span class="m">RUN-260818-0014</span>','FX-06','GB','第一段 · 看商品图',bar(9),'<span class="m">0分41秒</span>',btn('详情')],
      ]
    ), {flush:true}) +

    panel('今天失败的（已按原因归类）', table(
      ['原因','说清楚是什么意思','条数','该怎么修','涉及商品',''],
      [
        ['<span class="m">资料不全</span>','商品资料必填项没填','2','让运营补齐后重跑','FX-07, FX-09',btn('批量重跑','btn')],
        ['<span class="m">数据没读全</span>','关键词表读到的行数和表里对不上','1','重新导一次关键词表','FX-02',btn('去导入')],
        ['<span class="m">标题没词可用</span>','所有候选词都没通过标题准入','1','看选词记录，或放宽类目规则','FX-05',btn('看选词记录')],
        ['<span class="m">亮点没新内容</span>','亮点相对标题没提供新信息','1','只重做亮点，不整篇重写','FX-05',btn('失败重做')],
      ]
    ), {flush:true, note:'失败原因 → 修复动作是<b>系统定死的对应关系</b>（18 条规则），不用你判断该怎么修。'});
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
    return stats([
      ['一次通过率','83.6%','目标 85% 以上','warn',false],
      ['人工花的时间','2分41秒','每条商品，目标 3 分钟内','ok',false],
      ['数据读全率','100%','必须 100%','ok',false],
      ['凑字数的词','0','必须是 0','ok',false],
    ],4) +

    '<div class="cols c2">' +
      panel('失败原因分布（近 4 周）', table(
        ['原因','W31','W32','W33','W34','趋势'],
        [
          ['亮点没新内容','9','7','4','3','↓ 好转'],
          ['标题没词可用','2','3','2','4','↑ 变差'],
          ['数据没读全','5','1','0','1','— 平'],
          ['商品资料不全','6','6','5','7','↑ 变差'],
        ]
      ), {flush:true, note:'<b>「商品资料不全」走高不是系统退化</b>——那是运营填表的问题，应该转给运营看，不该算在系统头上。指标要能分清这两类。'}) +

      panel('版本分界线', kv([
        ['当前参数','P-v4 · 8-14 起'],
        ['当前 AI 指令','PR-v7 · 8-16 起'],
        ['当前模型','MDL-v3 · 8-18 起'],
        ['本周是否混版','是 · W34 含两个模型版本'],
      ]) + '<div style="margin-top:12px">' + callout('warn','这周的数字不能直接和上周比',
        'W34 中途换了模型。<b>换模型等于换了写作者</b>，通过率的变化可能来自模型而不是参数。要下结论，只能在同版本区间内比较。') + '</div>') +
    '</div>';
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
    var ar = '<div class="farrow">-></div>';
    function pnode(no, t, c, s, go){
      return '<div class="pnode" onclick="location.hash=\''+go+'\'">'+
        '<div class="pnode__no">'+no+'</div>'+
        '<div class="pnode__t">'+t+'</div>'+
        '<div class="pnode__c">'+c+'</div>'+
        '<div class="pnode__s">'+s+'</div></div>';
    }

    return stats([
      ['关键词累计入库','128 万','5 份快照 · 零丢失','ok',false],
      ['选词记录累计','142,038','每条候选进不进、为什么','ok',false],
      ['定稿文案累计','84 套','42 商品 × 2 站点','',false],
      ['其中已可上架','74 套','其余在人工或重做中','warn',false],
    ],4) +

    panel('12 道工序 · 每道积累了多少',
      '<div class="psec">第一段 · 搞懂商品和市场（工序 1-5）</div>' +
      '<div class="flow">' +
        pnode('01','收商品资料','42 份','事实 486 条 · 必填全部确认','sku-detail') + ar +
        pnode('02','看商品图','126 条','图片识别结论 · 均经防编造复核','sku-dna') + ar +
        pnode('03','处理关键词表','128 万行','5 份快照 · 逐行读完','data-kw') + ar +
        pnode('04','判断买家意图','21.4 万条','一词可挂多个意图标签','data-opp') + ar +
        pnode('05','锁定主定位','84 条','42 商品 × 2 站点各一条','gen-run') +
      '</div>' +

      '<div class="psec">第二段 · 决定写什么并写出来（工序 6-10）</div>' +
      '<div class="flow">' +
        pnode('06','列机会清单','88,412 条','含被拒的，每条有理由','data-opp') + ar +
        pnode('07','写标题','84 份','选词记录 41,208 条','rev-ledger') + ar +
        pnode('08','写亮点','84 份','选词记录 38,540 条','rev-ledger') + ar +
        pnode('09','写五点','420 条','选词记录 36,612 条','rev-ledger') + ar +
        pnode('10','写后台搜索词','84 份','选词记录 25,678 条','rev-ledger') +
      '</div>' +

      '<div class="psec">第三段 · 自检并交付（工序 11-12）</div>' +
      '<div class="flow">' +
        pnode('11','反向理解测试','84 次','独立模型只看成品反推','rev-audit') + ar +
        pnode('12','出检查报告并交付','84 份','可上架 74 · 需人工 6 · 重做中 4','rev-list') +
      '</div>' +

      '<div class="psec">回流段 · 不属 12 道工序，但在持续积累（-> 喂回工序 4/6，让下一批更准）</div>' +
      '<div class="flow">' +
        pnode('↺','上线登记 ASIN','2 条','不登记就没有效果跟踪','fb-publish') + ar +
        pnode('↺','每周表现数据','4,102 行','按入口类型分开统计','fb-perf') + ar +
        pnode('↺','词的升降级','312 次','表现好的升级、零曝光的淘汰','data-grade') + ar +
        pnode('↺','版本迭代','3+3+3 版','参数 / AI 指令 / 模型，全部可回测','fb-backtest') +
      '</div>',
    {flush:true, sub:'数字都是系统启用以来的累计值，来自各工序落库的真实记录',
      note:'看懂这张图就明白"系统会越用越好"不是口号：<b>每一次生成都往 12 道工序里沉淀数据</b>，回流段再把这些数据变成更准的意图标注、词评级和参数版本。'}) +

    callout('','为什么 84 套定稿对应 74 套可上架',
      '12 道工序不是流水线走完就完--每套定稿都要过五项检查，过不了的进<b>定向重做</b>（只重做失败字段，最多 3 次），再不行转人工。所以累计值是"产出"，可上架值是"合格产出"，两个数字之间的差就是系统还在打磨的部分。');
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
      [btn('批量导入'), btn('新建商品','btn')]
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
            btn('详情')
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
    return '<div class="cols c21">' +
      panel('商品资料 · FX-03', '<div class="form g2">'+
        fld('商品编号', txt('FX-03', true)) +
        fld('所属系列', txt('PF-FLORAL-18')) +
        fld('这是什么 <span style="color:var(--red)">*</span>', txt('pillow covers'), '写「抱枕套」不能写「抱枕」——写错会让整套文案说错商品') +
        fld('尺寸 <span style="color:var(--red)">*</span>', txt('18x18 inch')) +
        fld('几个装 <span style="color:var(--red)">*</span>', txt('set of 2')) +
        fld('包含什么 <span style="color:var(--red)">*</span>', txt('covers only, inserts not included'), '含不含内芯必须写清，这是买家最容易误会的地方') +
        fld('材质', txt('faux linen')) +
        fld('工艺', txt('double-sided print')) +
        fld('结构', txt('hidden zipper')) +
        fld('功能', txt(''), '留空 = 不许说这类功能，不是「以后再补」') +
        fld('怎么清洗', txt('machine washable')) +
        fld('认证 / 安全', txt(''), '婴儿床笠类目必须填，否则整条不通过') +
      '</div>' +
      '<div style="margin-top:14px">'+fld('不能说的话（逗号分隔）', txt('waterproof, outdoor'),
        '写进去就永久生效，后面任何环节都不会再用这些词')+'</div>' +
      '<div class="btnrow" style="margin-top:14px">'+btn('保存','btn--ghost')+btn('保存并生成文案','btn')+btn('看修改历史')+'</div>'
      ) +
      panel('这份资料的情况', kv([
        ['已确认','11 项'],
        ['不确定','2 项（功能 / 认证）'],
        ['已禁止','2 项（防水 / 户外）'],
        ['最后修改','2026-08-18 09:14 · Oldcat'],
        ['商品图','3 张'],
        ['用过这份资料的任务','7 条'],
      ]) + '<div style="margin-top:14px">' +
        callout('stop','改资料会让已生成的文案作废',
          '有 7 条历史任务用过这份资料。改完之后系统<b>不会自动重写已上架的文案</b>，只会列一张「受影响清单」给你，由你决定要不要重跑。') +
      '</div>') +
    '</div>';
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
    return panel('系列', table(
      ['系列编号','共享什么','商品数','季节款式分布','检查',''],
      [
        ['<span class="m">PF-FLORAL-18</span>','花卉图案 · 仿亚麻','4','四季款 ×4',chip('正常','ok'),btn('展开')],
        ['<span class="m">PF-XMAS-20</span>','圣诞图案 · 天鹅绒','3','圣诞款 ×3',chip('正常','ok'),btn('展开')],
        ['<span class="m">PF-SUM-WP</span>','纯色 · 户外面料','2','春夏防水款 ×2',chip('正常','ok'),btn('展开')],
        ['<span class="m">PF-MIX-RISK</span>','向日葵图案','5','四季款 ×3 / 秋款 ×2',chip('季节混装','warn'),btn('展开','btn')],
      ]
    ), {flush:true, note:'<b>PF-MIX-RISK 就是典型的容易出事的情况</b>：同一个图案跨了两个季节款式。系统不阻止你这样建，但「防水/户外」这类说法会被二次校验拦住，不会串过去。'}) +

    panel('系列内差异（PF-FLORAL-18）', table(
      ['商品','尺寸','几个装','应该共享','应该独享','检查'],
      [
        ['<span class="m">FX-01</span>','16x16','2 个装','图案/材质/风格','尺寸/数量',chip('一致','ok')],
        ['<span class="m">FX-03</span>','18x18','2 个装','图案/材质/风格','尺寸/数量',chip('一致','ok')],
        ['<span class="m">FX-11</span>','20x20','4 个装','图案/材质/风格','尺寸/数量',chip('一致','ok')],
        ['<span class="m">FX-12</span>','18x18','2 个装','图案/材质/风格','尺寸/数量',chip('材质对不上','warn')],
      ]
    ), {flush:true});
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
    return '<div class="cols c2">' +
      panel('系统认定的商品身份', kv([
        ['这是什么','pillow covers 抱枕套'],
        ['尺寸','18x18 inch'],
        ['几个装','set of 2'],
        ['包含','只有外套，不含内芯'],
      ])) +
      panel('系统从图片看到的', kv([
        ['主视觉','水彩绣球花'],
        ['次级风格','田园 / 乡村装饰'],
        ['主色','灰蓝 + 奶油白'],
        ['画风','柔和水彩'],
        ['防编造复核',chip('已通过 · 另一个模型重看核对','ok')],
      ])) +
    '</div>' +

    panel('逐条事实', table(
      ['事实','内容','状态','从哪来','能用在哪些字段','适用站点'],
      [
        ['这是什么','pillow covers',chip('已确认','ok'),'你填的资料','标题 / 亮点 / 五点 / 后台词','US, GB'],
        ['尺寸','18x18 inch',chip('已确认','ok'),'你填的资料','标题 / 亮点 / 五点 / 后台词','US, GB'],
        ['材质','faux linen',chip('已确认','ok'),'你填的资料','亮点 / 五点 / 后台词','US, GB'],
        ['工艺','double-sided print',chip('推断','warn'),'系统看图猜的','<b>不含标题</b> · 五点 / 后台词','US, GB'],
        ['防水','—',chip('已禁止','fail'),'你写进「不能说的话」','（哪都不能用）','—'],
        ['认证/安全','—',chip('不确定','neutral'),'没填','（哪都不能用）','—'],
      ]
    ), {flush:true, note:'<b>看第 4 行</b>：工艺是系统看图推断的，所以它能写进五点，但<b>不许进标题</b>。这就是「事实是真的 ≠ 有资格进标题」在系统里的具体表现。'});
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
    return stats([
      ['同时最多跑','3 条','控制费用与服务器压力','',true],
      ['排队中','11 条','预计 1 小时 42 分','',true],
      ['本批次','B-260818-02','共 18 条','',true],
      ['今日已用量','412 K','上限 2 M','ok',true],
    ],4) +
    panel('队列', toolbar(
      [sel('全部批次',['B-260818-02','B-260818-01']), sel('全部站点',['美国','英国'])],
      [btn('暂停队列'), btn('批量取消','btn--danger')]
    ) + table(
      ['排序','任务编号','商品','站点','优先级','状态','预计开始',''],
      [
        ['1','<span class="m">RUN-260818-0011</span>','FX-04','US','加急',chip('运行中','run'),'—',btn('取消','btn--danger')],
        ['2','<span class="m">RUN-260818-0012</span>','FX-04','GB','加急',chip('运行中','run'),'—',btn('取消','btn--danger')],
        ['3','<span class="m">RUN-260818-0013</span>','FX-06','US','普通',chip('运行中','run'),'—',btn('取消','btn--danger')],
        ['4','<span class="m">RUN-260818-0015</span>','FX-06','GB','普通',chip('排队','neutral'),'<span class="m">约 3 分钟后</span>',btn('取消')],
        ['5','<span class="m">RUN-260818-0016</span>','FX-08','US','普通',chip('排队','neutral'),'<span class="m">约 12 分钟后</span>',btn('取消')],
        ['6','<span class="m">RUN-260818-0017</span>','FX-08','GB','普通',chip('排队','neutral'),'<span class="m">约 21 分钟后</span>',btn('取消')],
      ]
    ), {flush:true});
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
    return flow([
      {t:'第一段 · 搞懂商品和市场', s:'5 个步骤 · 已完成'},
      {t:'第二段 · 决定写什么并写出来', s:'5 个步骤 · 已完成'},
      {t:'第三段 · 自检并交付', s:'2 个步骤 · 正在做'},
    ]) +

    phaseFlow([
      { no:'一', state:'done', time:'3分45秒', chip:chip('已完成','ok'),
        t:'搞懂商品和市场', s:'系统先弄明白这是个什么商品，以及买家在市场上怎么找它',
        steps:[
          ['done','收商品资料','11 项已确认，2 项被你标为不能说','0.4秒'],
          ['done','看商品图','3 张图，另一个模型复核过，没有编造','18.2秒'],
          ['done','处理关键词表','表里 21,408 行，全部读完，一行没漏','1分52秒'],
          ['done','判断买家意图','把尺寸/颜色/风格/场景/用途连成关系网','41.0秒'],
          ['done','锁定主定位','确定 2 条主要的「买家怎么找到它」的路径','12.8秒'],
        ]},
      { no:'二', state:'done', time:'4分29秒', chip:chip('已完成','ok'),
        t:'决定写什么并写出来', s:'先列出所有可用的词和卖点，再逐个字段决定谁进谁不进，然后才动笔',
        steps:[
          ['done','列机会清单','最重要 9 个 / 重要 17 个 / 一般 95 个 / 不合适 220 个','33.5秒'],
          ['done','写标题','6 个词通过准入，41 个被拒（各有理由）· 74 字符','48.1秒'],
          ['done','写亮点','只用标题没覆盖的内容 · 新增 4 个信息点','52.6秒'],
          ['done','写五点描述','从 11 个任务里挑了 5 个，每条讲不同的事 · 平均 331 字符','1分38秒'],
          ['done','写后台搜索词','补前台没写到的同义词和长尾 · 244/250 字节','36.9秒'],
        ]},
      { no:'三', state:'now', time:'进行中', chip:chip('正在做','run'),
        t:'自检并交付', s:'另一个模型只看最终文案，反推「这是什么、适合谁、为什么买」，和主定位对一遍',
        steps:[
          ['done','反向理解测试','独立复核 · 结论与主定位一致','29.4秒'],
          ['now','出检查报告并交付','五项检查全部通过 → 转「待审核」','—'],
        ]},
    ]) +

    '<div class="cols c2">' +
      panel('这条任务的基本信息', kv([
        ['任务编号','RUN-260818-0007'],
        ['商品 / 站点','FX-03 / 美国'],
        ['类目','抱枕套'],
        ['季节款式','四季款'],
        ['所属系列','PF-FLORAL-18'],
        ['关键词数据','8-12 版'],
        ['商品图指纹','a91f4b2e…c07'],
      ])) +
      panel('可以做什么', '<div class="btnrow">'+
        btn('看生成出来的文案','btn')+btn('看检查报告')+btn('下载中间产物')+btn('取消这条任务','btn--danger')+
        '</div>' + callout('','为什么这里不能改内容',
          '生成过程中的每一步都有<b>上下游依赖</b>：改了中间某一步，后面所有判断的前提就变了，但已经算完的部分不会自动跟着变。所以这里只能重跑，不能改。')) +
    '</div>';
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
    return callout('warn','RUN-260817-0031 · FX-05 · 美国站',
      '「亮点」这个字段已经重做 3 次还是不通过。按规则<b>已经自动转人工处理</b>，不再提供重做按钮。') +

    panel('各字段状态', table(
      ['字段','状态','什么问题','已重做','系统给的修复动作',''],
      [
        ['标题',chip('通过','ok'),'—','0/3','—',chip('已锁定','sys')],
        ['亮点',chip('不通过','fail'),'相对标题没有提供新信息','3/3','扩大可用词范围 → 还不够就把内容下沉到五点',btn('已超限','btn--ghost')],
        ['五点描述',chip('还没轮到','neutral'),'—','0/3','要等亮点定下来才能开始','—'],
        ['后台搜索词',chip('还没轮到','neutral'),'—','0/3','要等前台三个字段写完','—'],
      ]
    ), {flush:true}) +

    panel('三次重做分别做了什么', table(
      ['第几次','时间','调整了什么','结果','新增信息点'],
      [
        ['1','8-17 21:04','按规则扩大可用词范围','还是不通过','2 个（要求至少 3 个）'],
        ['2','8-17 21:11','放宽相近词的准入','还是不通过','2 个'],
        ['3','8-17 21:19','允许用强化关系的表达','还是不通过','2 个'],
      ]
    ), {flush:true, note:'三次都停在 2 个新增信息点 —— <b>这不是碰运气没碰上，是可用的词确实不够</b>。所以系统的结论是「交给人」，而不是继续试到通过为止。'}) +

    '<div class="btnrow">'+btn('看这个字段的选词记录','btn')+btn('转人工处理')+'</div>';
  }
});
