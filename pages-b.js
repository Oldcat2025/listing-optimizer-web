/* ══ 页面组 ④文案与审核 ⑤数据管理 ══ */

/* ───────── ④ 文案与审核 ───────── */

page('rev-list', {
  roles:['运营','审核','管理员'],
  guide:[
    '状态是<b>「待审核」</b>的等审核放行；<b>「可上架」</b>的运营可以直接复制。',
    '「能否上架」这一列<b>任何人都改不了</b>——它由系统根据五项检查自动判定。',
    '看到「有说明的通过」不要慌：意思是某项偏短，但系统已经证明了「确实没有更值得加的词」。'
  ],
  spec:{
    q:'哪些文案已经生成好了、各自什么状态、能不能上架。',
    acts:['筛选','进入详情','批量导出 Excel','进入审核'],
    wf:['无'],
    reads:['listing_final','certificate','run','review_action'],
    writes:['无'],
    limits:[
      '<b>「能否上架」列只读</b>——它不属于任何角色，只由系统依五项检查写入',
      '运营只能看，放行动作在 4.5'
    ]
  },
  body:function(){
    var html = toolbar(
      [inp('搜索标题'), sel('全部状态',['completed','pending','review'])],
      [btn('导出 Excel'), btn('导出到表格')]
    ) + '<div id="rev-data" style="margin-top:14px">' + ghost('正在加载文案列表…') + '</div>';
    setTimeout(function(){
      API.listings().then(function(r){
        var el = document.getElementById('rev-data');
        if (!el) return;
        var rows = (r.ok && r.data && r.data.data) ? r.data.data : [];
        if (!rows.length){ el.innerHTML = callout('warn','还没有文案','生成任务完成后，文案会出现在这里。'); return; }
        var toneOf = function(st){
          if (st==='completed'||st==='已上架') return 'ok';
          if (st==='pending') return 'neutral';
          return 'run';
        };
        var tr = rows.map(function(x){
          var t = x.title||'';
          return [
            '<span class="m">'+(t.length>42 ? t.slice(0,42)+'…' : t)+'</span>',
            '<span class="num">'+String(x.backend||'').length+'</span>',
            chip(x.status||'pending', toneOf(x.status)),
            x.created_at||'—',
            btn('详情', '', 'rev-detail')
          ];
        });
        el.innerHTML = table(['标题','后台词字节','状态','生成日期',''], tr);
      });
    }, 0);
    return html;
  }
});

page('rev-detail', {
  roles:['运营','审核','管理员'],
  guide:[
    '每一段右上角都有<b>「复制」</b>按钮，直接粘到亚马逊后台就行。',
    '字数/字节是<b>系统算的</b>，不是 AI 自己数的——AI 数字数不可靠，这里的数字可以信。',
    '中文对照只是给你核对用的，<b>不要上架中文</b>。'
  ],
  spec:{
    q:'文案长什么样，能不能直接复制上架。',
    acts:['逐段复制','整套复制','看中文对照','跳检查报告','跳选词记录'],
    wf:['无'],
    reads:['listing_final','certificate','marketplace_config'],
    writes:['audit_log（复制行为留痕，可选）'],
    limits:[
      '字符/字节计数<b>由后端计算后下发</b>，前端只展示，口径必须唯一',
      '页面不提供任何编辑入口——要改只能重跑，或走 4.5 覆写并留痕'
    ]
  },
  body:function(){
    var el = '<div id="rev-detail-root">' + ghost('正在加载文案详情…') + '</div>';
    setTimeout(function(){
      var flt = window.CUR_SKU ? {SKU: window.CUR_SKU} : {};
      API.table('定稿输出表', flt, 50).then(function(r){
        var root = document.getElementById('rev-detail-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) {
          root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return;
        }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['Title']; });
        if (!rows.length) { root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        rows.sort(function(a,b){
          var ta = String(a['生成时间']||''), tb = String(b['生成时间']||'');
          return ta < tb ? 1 : (ta > tb ? -1 : 0);
        });
        var x = rows[0];
        var cp = btn('复制');
        var bullets = ['Bullet 1','Bullet 2','Bullet 3','Bullet 4','Bullet 5'];
        var bm = bullets.map(function(b){
          var t = x[b]||'';
          return copybox('五点描述 · ' + b, t, '<b>' + (x[b+'字符数']||String(t).length) + '</b> 字符', cp);
        }).join('');
        var cn = bullets.map(function(b){
          var v = x[b+'中文对照'];
          return v ? '<b>'+b+'</b>：'+v : '';
        }).filter(Boolean).join('<br>');
        root.innerHTML =
          '<div class="cols c21">' +
            '<div>' +
              copybox('标题 Title', x['Title']||'', '<b>'+(x['Title字符数']||'')+'</b> 字符', cp) +
              copybox('亮点 Highlights', x['Highlights']||'', '<b>'+(x['Highlights字符数']||'')+'</b> 字符' + (x['Highlights短语数']?' · '+x['Highlights短语数']+' 个短语':''), cp) +
              bm +
              copybox('后台搜索词 Backend', x['Backend Search Terms']||'', '<b>'+(x['Backend字节数']||'')+'</b> 字节', cp, true) +
            '</div>' +
            '<div>' +
              panel('这套文案是怎么来的', kv([
                ['商品 / 站点', (x['SKU']||'—')+' / '+(x['目标市场']||'—')],
                ['任务编号', x['运行ID']||'—'],
                ['文案版本', x['定稿版本号']||'—'],
                ['生成时间', x['生成时间']||'—'],
              ]), {sub:'出问题时按这几项就能复现'}) +
              panel('中文对照（仅供核对，不要上架）', '<div style="font-size:13px;color:var(--t-2);line-height:1.7">' +
                '<b>标题</b>：'+(x['Title中文对照']||'—')+'<br><br>' +
                '<b>亮点</b>：'+(x['Highlights中文对照']||'—') + (cn?'<br><br>'+cn:'') +
                '</div>') +
              '<div class="btnrow">'+btn('看检查报告','btn')+btn('看选词记录')+btn('整套复制')+'</div>' +
            '</div>' +
          '</div>';
      });
    }, 0);
    return el;
  }
});

page('rev-audit', {
  roles:['运营','审核','管理员'],
  guide:[
    '这份报告回答一件事：<b>凭什么说这套文案是对的</b>。',
    '先看「五项检查」有没有全绿；再看「反向理解测试」——那是另一个 AI <b>只看最终文案</b>反推出来的理解，和你的商品对不对得上。',
    '想知道某个词为什么在标题里（或为什么没进去），去 4.4 选词记录看每一条的理由。'
  ],
  spec:{
    q:'凭什么说这套文案是对的？—— 这一页就是产品的核心价值。',
    acts:['展开各项检查明细','看反向理解结果','看字段覆盖图','导出报告'],
    wf:['WF-28-07 审计与证书（只读产物）'],
    reads:['certificate','listing_final','field_candidate','opportunity','cosmo_relation'],
    writes:['无'],
    limits:[
      '所有判定必须由<b>系统代码</b>产出；AI 只提供反推文本，<b>不给自己打分</b>',
      '不允许出现「综合得分」——各类证据不得混成一个说不清的总分',
      '任何不通过必须写清「哪个字段 + 什么原因 + 怎么修」三件事'
    ]
  },
  body:function(){
    var el = '<div id="rev-audit-root">' + ghost('正在加载检查报告…') + '</div>';
    setTimeout(function(){
      API.table('证书表', {}, 50).then(function(r){
        var root = document.getElementById('rev-audit-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) {
          root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return;
        }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['运行ID']; });
        if (!rows.length) { root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        rows.sort(function(a,b){
          var ta = String(a['生成时间']||''), tb = String(b['生成时间']||'');
          return ta < tb ? 1 : (ta > tb ? -1 : 0);
        });
        var x = rows[0];
        var certCols = Object.keys(x).filter(function(k){ return k.indexOf('证书') >= 0 && k !== '全部通过'; });
        function verdict(v){
          var o = v;
          if (typeof v === 'string') { try { o = JSON.parse(v); } catch(e){ o = null; } }
          if (o && typeof o === 'object') {
            var st = String(o.status || o.certificate_type || '');
            var stUp = st.toUpperCase();
            var tone = (stUp === 'PASS' || stUp === 'PASS_WITH_NOTES') ? 'ok' : (stUp.indexOf('FAIL') === 0 ? 'fail' : 'warn');
            var head = '<div style="margin:4px 0 8px">' + chip(st || '—', tone) + '</div>';
            var asrts = (Array.isArray(o.assertions) && o.assertions.length) ? o.assertions : null;
            if (asrts) {
              var rows = asrts.map(function(a){
                var at = String(a.status || '').toUpperCase();
                var tt = (at === 'PASS' || at === 'PASS_WITH_NOTES') ? 'ok' : (at.indexOf('FAIL') === 0 ? 'fail' : 'warn');
                var c = chip(a.status || '—', tt);
                if (at === 'FAIL' || at === 'WARN') {
                  c += '<div class="dim" style="font-size:12px;color:var(--t-4);margin-top:2px">实际：' + String(a.actual || '—').slice(0,90) + '<br>期望：' + String(a.expected || '—').slice(0,90) + '</div>';
                }
                return [ (a.id || '—'), c, String(a.desc || '—').slice(0,100) ];
              });
              return head + table(['断言','结论','说明'], rows);
            }
            var keys = Object.keys(o).filter(function(k){ var vv = o[k]; return vv === null || (typeof vv !== 'object'); });
            if (!keys.length) return table(['结论'], [[String(v || '—')]]);
            return head + table(['检查项','结论'], keys.map(function(k){ return [k, String(o[k])]; }));
          }
          return table(['结论'], [[String(v || '—')]]);
        }
        var passed = String(x['全部通过']||'').toUpperCase() === 'TRUE';
        root.innerHTML =
          stats([
            ['全部通过', passed ? '是' : '否', '五证书全 PASS 才为是', passed?'ok':'fail', false],
            ['商品 / 站点', (x['SKU']||'—')+' / '+(x['目标市场']||'—'), '', '', false],
            ['证书数量', String(certCols.length), '', '', false],
            ['生成时间', String(x['生成时间']||'—').slice(0,16), '', '', false],
          ], 4) +
          certCols.map(function(col){ return panel(col, verdict(x[col]), {flush:true}); }).join('');
      });
    }, 0);
    return el;
  }
});

page('rev-ledger', {
  roles:['运营','审核','管理员'],
  guide:[
    '这一页记录<b>每一个候选词的下落</b>：进了哪个字段、承担什么任务、为什么被拒。',
    '「证据」列的彩色字母表示这个词的依据来自哪里，<b>鼠标停上去有说明</b>。四类证据是分开看的，不会混成一个分数。',
    '想知道「为什么这个词没进标题」，直接筛「去向 = 被拒绝」，理由都写在最后一列。'
  ],
  spec:{
    q:'每个候选词的下落 —— 进了哪个字段、承担什么任务、为什么被拒。',
    acts:['多维筛选','按去向分组','展开单条证据','导出'],
    wf:['无'],
    reads:['field_candidate','opportunity','evidence'],
    writes:['无'],
    limits:[
      '<b>去向不允许为空</b>（数据库有约束兜底），页面上也不允许出现「—」',
      '候选量级为百到千行，必须服务端分页 + 数据库筛选，禁止前端全量拉取'
    ]
  },
    body:function(){
    var el = '<div id="rev-ledger-root">' + ghost('正在加载候选台账…') + '</div>';
    setTimeout(function(){
      API.table('候选台账', {}, 200).then(function(r){
        var root = document.getElementById('rev-ledger-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['候选ID']; });
        function has(v, kw){ return String(v||'').indexOf(kw) >= 0; }
        var intoTitle = rows.filter(function(x){ return has(x['字段决策'],'标题'); }).length;
        var intoHL = rows.filter(function(x){ return has(x['字段决策'],'亮点'); }).length;
        var intoBackend = rows.filter(function(x){ return has(x['字段决策'],'五点')||has(x['字段决策'],'后台'); }).length;
        var rejected = rows.filter(function(x){ return has(x['字段决策'],'拒绝'); }).length;
        root.innerHTML =
          stats([
            ['候选词总数', rows.length, '', ' ', false],
            ['进了标题', intoTitle, '拒绝 '+rejected, 'ok', false],
            ['进了亮点', intoHL, '', ' ', false],
            ['下沉到五点/后台', intoBackend, '', ' ', false],
            ['被拒绝', rejected, '每条都有理由', '', false],
          ], 5) +
          panel('候选词台账（'+rows.length+' 条）', table(
            ['候选词','类型','任务角色','字段决策','目的地理由','最终状态'],
            rows.slice(0,50).map(function(x){ return [
              '<span class="m">'+(x['表面文本']||'')+'</span>',
              x['候选类型']||'—',
              x['任务角色']||'—',
              chip(x['字段决策']||'', has(x['字段决策'],'拒绝')?'fail':(has(x['字段决策'],'标题')?'ok':'')),
              x['目的地理由']||'—',
              chip(x['最终状态']||'', x['最终状态']==='被拒绝'?'fail':'ok')
            ]; })
          ), {flush:true});
      });
    }, 0);
    return el;
  }
});

page('rev-action', {
  roles:['审核','管理员'],
  guide:[
    '先看检查报告，再决定<b>放行</b>还是<b>打回</b>。打回时要指定改哪个字段，系统只重做那一个。',
    '如果你认为系统判错了某个词，可以「<b>人工改判</b>」，但<b>必须写理由</b>——理由会存进台账。',
    '<b>改判提交后系统会自动重跑五项检查</b>（几秒钟），不用你手动再点一次。检查通过才算能上架。'
  ],
  spec:{
    q:'我是否放行这套文案；如果打回，打回给谁、修什么。',
    acts:['放行','打回','人工改判选词结论（强制填理由）','转人工'],
    wf:['打回 → WF-28-08 定向重试','改判 → 自动触发 WF-28-07 只重跑证书'],
    reads:['listing_final','certificate','field_candidate'],
    writes:['review_action','override_ledger','run.status','audit_log'],
    limits:[
      '<b>改判必须填理由且落台账</b>，无理由不可提交',
      '改判后<b>自动重跑证书</b>（不重跑生成）；「能否上架」仍由证书结果决定，人工无法直接置真',
      '运营角色<b>无本页权限</b>'
    ]
  },
    body:function(){
    var el = '<div id="rev-action-root">' + ghost('正在加载待审核…') + '</div>';
    setTimeout(function(){
      API.table('定稿输出表', {'准备发布':'是'}, 20).then(function(r){
        var root = document.getElementById('rev-action-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['SKU']; });
        var head = rows.length ? ('待审核 · ' + rows[0]['SKU'] + ' / ' + (rows[0]['目标市场']||'—') + ' / v' + (rows[0]['定稿版本号']||'1')) : '暂无待审核文案';
        var body0 = rows.length ? '五项检查已完成。你放行之后，运营复制上架，再回来登记 ASIN，这条商品才进入效果跟踪。' : '当前没有待审核的定稿文案。';
        root.innerHTML = callout('', head, body0) +
          '<div class="cols c2">' +
            panel('放行 / 打回', '<div class="form">'+
              fld('你的结论', pick(['放行','打回 · 让运营补商品资料','打回 · 只重做某个字段','转人工处理'])) +
              fld('打回哪个字段（选了打回才需要填）', pick(['—','标题','亮点','五点描述','后台搜索词'])) +
              fld('审核意见', '<textarea class="ctl" rows="4" placeholder="写给下一个人看的，会存进操作记录"></textarea>') +
            '</div><div class="btnrow" style="margin-top:14px">'+btn('提交结论','btn')+'</div>') +
            panel('待审核列表', table(['SKU','站点','定稿版本',''], rows.slice(0,10).map(function(x){ return ['<span class="m">'+(x['SKU']||'')+'</span>', x['目标市场']||'—', 'v'+(x['定稿版本号']||'1'), btn('审核','btn')]; })), {flush:true}) +
          '</div>' +
          callout('info','人工改判','人工改判选词结论需要接入候选台账写接口，当前暂未开放。');
      });
    }, 0);
    return el;
  }
});

page('rev-manual', {
  roles:['运营','审核','管理员'],
  guide:[
    '进到这里的都是<b>系统已经放弃自动修复</b>的，必须人来判断。',
    '先分清是哪一类：<b>系统尽力了但词不够</b>，还是<b>你的商品资料没填全</b>——这两类要找不同的人。',
    '处理完点「认领」，避免两个人同时改同一条。'
  ],
  spec:{
    q:'哪些任务系统已经放弃自动修复，需要人来做决定。',
    acts:['认领','补资料后重跑','人工改写并留痕','关闭并归档'],
    wf:['重跑 → WF-28-00'],
    reads:['run','certificate','field_candidate','retry_log'],
    writes:['run.status','manual_review','audit_log'],
    limits:['进入人工队列时<b>保留全部中间证据</b>，不清理','人工改写的文本必须标记来源=人工，不混入系统产出统计']
  },
  body:function(){
    var el = '<div id="rev-manual-root">' + ghost('正在加载需人工处理队列…') + '</div>';
    setTimeout(function(){
      API.table('SKU_输入表', {'处理状态':'REVIEW_REQUIRED'}, 200).then(function(r){
        var root = document.getElementById('rev-manual-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) {
          root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return;
        }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['SKU']; });
        if (!rows.length) { root.innerHTML = callout('warn','暂无数据','当前没有需要人工处理的商品。'); return; }
        root.innerHTML =
          panel('需人工处理（' + rows.length + ' 条）', table(
            ['任务编号','商品/站点','状态','为什么进来','更新时间',''],
            rows.map(function(x){
              return [
                '<span class="m">'+(x['运行ID']||'—')+'</span>',
                (x['SKU']||'—')+' / '+(x['目标市场']||'—'),
                chip(x['处理状态']||'', 'warn'),
                x['错误信息']||'—',
                '<span class="m">'+String(x['更新时间']||x['处理时间']||'').slice(0,16)+'</span>',
                btn('认领','btn')
              ];
            })
          ), {flush:true});
      });
    }, 0);
    return el;
  }
});

/* ───────── ⑤ 数据管理 ───────── */

page('data-kw', {
  roles:['管理员'],
  guide:[
    '上传卖家精灵导出的表 → 系统自动比对列名 → 看预览确认没问题 → 点「建快照」。',
    '<b>每次导入都新建一份快照，不会覆盖旧的</b>。已经被任务用过的快照永久只读，保证历史结果可复现。',
    '重点看「完整性证明」：<b>读到的行数必须等于表里的行数</b>，差一行都不行。',
    '四季款和圣诞款的数据<b>要分开导</b>，系统会拦住跨季节读数据。'
  ],
  spec:{
    q:'这批卖家精灵数据干净吗，能不能拿去生成文案。',
    acts:['上传全表','列名比对','预览','建快照','作废快照','设为默认'],
    wf:['WF-28-02 数据摄取（或入库后由 SQL 完成分类）'],
    reads:['keyword_snapshot','keyword_raw','marketplace_config'],
    writes:['keyword_snapshot','keyword_raw','import_batch','audit_log'],
    limits:[
      '<b>导入永远新建快照，绝不覆盖</b>；被任何任务引用过的快照永久只读',
      '列名匹配<b>必须去空格比对</b>（第 27 列无空格、30/33 列有空格）',
      '搜索排名无值必须写空，<b>写 0 会被当成全站最热门</b>（数据库有约束兜底）',
      '「关键词翻译」列落库但<b>禁止进入 AI 提示词</b>，否则中式表达会带回本地语言'
    ]
  },
    body:function(){
    var el = '<div id="data-kw-root">' + ghost('正在加载词库…') + '</div>';
    setTimeout(function(){
      API.table('站点词库_US', {}, 200).then(function(r){
        var root = document.getElementById('data-kw-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['关键词']; });
        var total = r.data.total || rows.length;
        root.innerHTML =
          panel('词库概览', kv([
            ['词库行数（全表）', total],
            ['本页展示', rows.length],
            ['示例关键词', (rows[0]&&rows[0]['关键词'])||'—'],
          ])) +
          panel('关键词列表（'+rows.length+' 条）', table(
            ['关键词','关键词翻译','月搜索量','购买率','相关度','需供比'],
            rows.slice(0,50).map(function(x){ return [
              '<span class="m">'+(x['关键词']||'')+'</span>',
              x['关键词翻译']||'—',
              x['月搜索量']||'—',
              x['购买率']||'—',
              x['相关度']||'—',
              x['需供比']||'—'
            ]; })
          ), {flush:true});
      });
    }, 0);
    return el;
  }
});

page('data-ppc', {
  roles:['管理员'],
  guide:[
    '两份数据的作用不一样：<b>搜索表现报告（SQP）</b>是主要依据，<b>广告报告（PPC）</b>主要提供花费信息。',
    '广告报告里没有「哪个 SKU 成交的」，所以系统靠「广告组 → 商品」的对应表来推断，推断出来的会<b>明确标注</b>。',
    '有两件事系统<b>确实做不到</b>，报告里会写明，不会假装能做到。'
  ],
  spec:{
    q:'账户侧的广告与搜索表现数据导进来了吗，各自算到哪一层。',
    acts:['上传广告报表','上传搜索表现报表','查看归因分层结果'],
    wf:['WF-28-02 数据摄取'],
    reads:['ppc_raw','sqp_raw','adgroup_sku_map'],
    writes:['ppc_raw','sqp_raw','account_query','import_batch'],
    limits:[
      '<b>搜索表现报告是主源</b>，广告报告只作花费证据与推断级归因',
      '禁止把「推断出来的」写成「确定的」、把「估算的」写成「自然流量」',
      '连带销售识别不可得 → 报告显式标注，不伪装'
    ]
  },
    body:function(){
    var el = '<div id="data-ppc-root">' + ghost('正在加载 PPC 数据…') + '</div>';
    setTimeout(function(){
      API.table('PPC出单词_US', {}, 200).then(function(r){
        var root = document.getElementById('data-ppc-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['客户搜索词']; });
        var total = r.data.total || rows.length;
        var clicks = rows.reduce(function(s,x){ return s + (parseInt(x['点击']||'0',10)||0); }, 0);
        var orders = rows.reduce(function(s,x){ return s + (parseInt(x['订单']||'0',10)||0); }, 0);
        var spend = rows.reduce(function(s,x){ return s + (parseFloat(x['花费']||'0')||0); }, 0);
        root.innerHTML =
          panel('PPC 出单词概览', kv([
            ['出单词总数（全表）', total],
            ['本页展示', rows.length],
            ['点击合计', clicks],
            ['订单合计', orders],
            ['花费合计', '$' + spend.toFixed(2)],
          ])) +
          panel('出单词列表（'+rows.length+' 条）', table(
            ['客户搜索词','广告活动','曝光','点击','花费','订单','ACOS'],
            rows.slice(0,50).map(function(x){ return [
              '<span class="m">'+(x['客户搜索词']||'')+'</span>',
              x['广告活动名称']||'—',
              x['曝光']||'—',
              x['点击']||'—',
              x['花费']||'—',
              x['订单']||'—',
              x['ACOS']||'—'
            ]; })
          ), {flush:true});
      });
    }, 0);
    return el;
  }
});

page('data-adgroup', {
  roles:['管理员'],
  guide:[
    '这张表告诉系统：<b>某个广告组是在推哪些商品</b>。',
    '只投一个商品的广告组，系统就能把成交推断到这个商品；投多个的只能算花费。',
    '「置信度」是系统<b>根据商品个数自动算的</b>，不用你填。'
  ],
  spec:{
    q:'每个广告组对应哪些商品 —— 这是广告数据能否用到商品级的关键。',
    acts:['编辑对应关系','批量导入','标记未对应'],
    wf:['无（供 WF-28-02 读取）'],
    reads:['adgroup_sku_map'],
    writes:['adgroup_sku_map','audit_log'],
    limits:['置信度由商品个数自动派生（数据库生成列），不允许手填','没建对应关系的广告组只贡献花费，不参与任何商品级判断']
  },
        body:function(){
    var el = '<div id="data-adgroup-root">' + ghost('正在加载广告组对应关系…') + '</div>';
    setTimeout(function(){
      API.table('广告组SKU映射', {}, 200).then(function(r){
        var root = document.getElementById('data-adgroup-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['广告活动名称']; });
        root.innerHTML =
          panel('广告组对应关系（'+rows.length+' 条）', table(
            ['广告活动名称','广告组名称','SKU列表','SKU数量','站点','映射置信度','核对日期'],
            rows.slice(0,50).map(function(x){ return [
              x['广告活动名称']||'—',
              x['广告组名称']||'—',
              '<span class="m">'+(x['SKU列表']||'')+'</span>',
              x['SKU数量']||'—',
              x['站点']||'—',
              chip(x['映射置信度']||'', x['映射置信度']==='SINGLE_SKU'?'ok':(x['映射置信度']==='MULTI_SKU'?'warn':'fail')),
              x['核对日期']||'—'
            ]; })
          ), {flush:true});
      });
    }, 0);
    return el;
  }
});

page('data-aba', {
  roles:['运营','审核','管理员'],
  guide:[
    '输入一个<b>竞品 ASIN</b>，系统会从关键词表里倒推：买家是从哪些搜索词找到这个爆款的。',
    '这不需要额外买反查工具——<b>数据本来就在你导的关键词表里</b>。',
    '注意区分<b>强证据</b>（前三名，有点击和转化份额）和<b>弱证据</b>（只在前十名列表里）。'
  ],
  spec:{
    q:'某个竞品是从哪些查询被发现的？—— 由关键词表倒排重建，不需要第三方反查源。',
    acts:['输入 ASIN 查询','按簇聚合','导出','导入外部反查报告（可选）'],
    wf:['无（SQL GIN 索引倒排）'],
    reads:['keyword_raw.top_asins','keyword_raw.top10_asins'],
    writes:['无'],
    limits:[
      '前三名有点击/转化份额 = <b>强证据</b>；前十名仅列表 = <b>弱证据</b>，两者不可混算',
      '本页只能说明「爆款从哪些查询被发现」，<b>不能</b>推断平台排名权重',
      '外部反查数据只作<b>补充证据</b>：导入必须带来源与时间，落库标「外部研究」，不与倒推的强证据混算'
    ]
  },
    body:function(){
    var el = '<div id="data-aba-root">' + ghost('正在加载品牌份额数据…') + '</div>';
    setTimeout(function(){
      API.table('SQP_US', {}, 200).then(function(r){
        var root = document.getElementById('data-aba-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) {
          root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return;
        }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['搜索查询']; });
        if (!rows.length) { root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        root.innerHTML = panel('品牌份额（SQP_US · 共 ' + rows.length + ' 条）', table(
          ['搜索查询','查询总量','曝光总量','品牌曝光份额','品牌购买份额'],
          rows.slice(0, 100).map(function(x){
            return [
              '<span class="m">'+(x['搜索查询']||'—')+'</span>',
              '<span class="num">'+String(x['查询总量']||'—')+'</span>',
              '<span class="num">'+String(x['曝光总量']||'—')+'</span>',
              '<span class="num">'+String(x['品牌曝光份额']||'—')+'</span>',
              '<span class="num">'+String(x['品牌购买份额']||'—')+'</span>'
            ];
          })
        ), {flush:true, note:'数据来自亚马逊官方「搜索查询绩效」品牌视图。品牌曝光/购买份额为空表示该查询下品牌暂未拿到份额。'});
      });
    }, 0);
    return el;
  }
});

page('data-opp', {
  roles:['运营','审核','管理员'],
  guide:[
    '这是系统识别出来的<b>所有机会</b>，按重要程度分了级。',
    '<b>最重要和重要的（P0/P1）必须 100% 有交代</b>：要么用上了，要么写明为什么没用。',
    '「入口层级」和「等级」是两回事：等级说值不值得用，入口层级说它在<b>流量结构里站哪一层</b>--四层要搭配着用，不能只挑最大的词。',
    '想知道某个机会最后落到哪个字段，看最后一列。'
  ],
  spec:{
    q:'系统识别出哪些机会、分了什么优先级、没用的那些为什么没用。',
    acts:['筛选','按等级分组','看省略理由','跨任务对比'],
    wf:['WF-28-03 语义意图层（只读产物）'],
    reads:['opportunity','evidence','field_candidate'],
    writes:['无'],
    limits:[
      '最重要/重要级必须 100%「已用上或有合法省略理由」，<b>不允许悄悄跳过</b>',
      '机会的价值是 9 个独立维度，<b>禁止在此页压成单一评分展示</b>',
      '入口层级（主入口 / 中尾 / 精准长尾 / 语义召回）是独立维度：四层组合搭配，<b>不得只取主入口，也不得全写成窄图案词</b>',
      'Intent 分类完整体系为 <b>12 类</b>（本页示例只画 6 类），一词允许挂多个标签',
      '状态不允许为空'
    ]
  },
    body:function(){
    var el = '<div id="data-opp-root">' + ghost('正在加载 ASIN 份额数据…') + '</div>';
    setTimeout(function(){
      API.table('SQP_ASIN_US', {}, 200).then(function(r){
        var root = document.getElementById('data-opp-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) {
          root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return;
        }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['搜索查询']; });
        if (!rows.length) { root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        root.innerHTML = panel('ASIN 份额（SQP_ASIN_US · 共 ' + rows.length + ' 条）', table(
          ['搜索查询','查询总量','ASIN曝光份额','ASIN购买份额','ASIN'],
          rows.slice(0, 100).map(function(x){
            return [
              '<span class="m">'+(x['搜索查询']||'—')+'</span>',
              '<span class="num">'+String(x['查询总量']||'—')+'</span>',
              '<span class="num">'+String(x['ASIN曝光份额']||'—')+'</span>',
              '<span class="num">'+String(x['ASIN购买份额']||'—')+'</span>',
              '<span class="m">'+(x['ASIN']||'—')+'</span>'
            ];
          })
        ), {flush:true, note:'数据来自亚马逊官方「搜索查询绩效」ASIN 视图。ASIN 购买份额 > 0 的查询即该 ASIN 已占住的入口。'});
      });
    }, 0);
    return el;
  }
});

page('data-grade', {
  roles:['审核','管理员'],
  guide:[
    '这里是<b>上线之后被真实数据验证过</b>的词：表现好的升级、长期没曝光的降级。',
    '<b>新词（探索词）单独评价</b>，不能用成熟词的标准去杀它——否则永远发现不了新入口。',
    '升降级只是<b>建议</b>，采纳后要跑回测，确认比现在好才生效。'
  ],
  spec:{
    q:'哪些词被真实表现验证过、哪些该降级 —— 进化闭环的词表侧。',
    acts:['查看升降级建议','采纳/驳回','手动标记探索词'],
    wf:['WF-28-09 反馈闭环（周）'],
    reads:['keyword_evidence_grade','performance_weekly','hypothesis_validation'],
    writes:['keyword_evidence_grade','audit_log'],
    limits:[
      '<b>探索词单独评价</b>：新的高潜长尾不能用成熟词的标准杀掉',
      '升降级是<b>建议</b>，采纳后生成新参数版本，不就地改',
      '新品前 14 天的数据不参与升降级判断'
    ]
  },
  body:function(){
    return callout('warn','暂无数据','该功能的数据源尚未建立，接入后显示实际内容。');
  }
});

page('data-import', {
  roles:['管理员'],
  guide:[
    '每次导入都留一条记录，<b>原始文件也保留</b>。',
    '将来如果解析规则改了，可以拿原始文件重新跑一遍，<b>分清是「数据源变了」还是「我们解析错了」</b>。',
    '有告警的批次点进去看细节，告警不代表失败。'
  ],
  spec:{
    q:'历次导入都发生了什么，有没有静默变形的地方。',
    acts:['查看批次详情','下载原始文件','对比两次快照'],
    wf:['无'],
    reads:['import_batch','keyword_snapshot','audit_log'],
    writes:['无'],
    limits:['原始文件<b>必须保留</b>，用于事后复核解析器是否改错了口径']
  },
  body:function(){
    return callout('warn','暂无数据','该功能的数据源尚未建立，接入后显示实际内容。');
  }
});
