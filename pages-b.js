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
      [inp('搜索标题或 SKU') + ' <button class="btn" id="rev-search-btn" style="margin-left:6px">搜索</button>'],
      [btn('导出 Excel','','','','','导出功能暂未开放')]
    ) + '<div id="rev-data" style="margin-top:14px">' + ghost('正在加载文案列表…') + '</div>';
    setTimeout(function(){
      function renderList(list, pendingRev){
        var el = document.getElementById('rev-data');
        if (!el) return;
        list = list || [];
        pendingRev = pendingRev || [];
        if (!list.length && !pendingRev.length){ el.innerHTML = callout('warn','没有匹配的文案','换个关键词试试。'); return; }
        list.sort(function(a,b){ var ta=String(a['生成时间']||''), tb=String(b['生成时间']||''); return ta<tb?1:(ta>tb?-1:0); });
        var tr = list.map(function(x){
          var t = x['Title']||'';
          var pub = String(x['准备发布']||'').toUpperCase();
          var st = (pub === 'TRUE') ? chip('可上架','ok') : chip('待审核','neutral');
          return [
            '<span class="num">'+(x['记录ID']||'—')+'</span>',
            '<span class="m">'+(t.length>40 ? t.slice(0,40)+'…' : t)+'</span>',
            x['目标市场']||'—',
            st,
            bjTime(x['生成时间']),
            btn('详情','','rev-detail',(x['SKU']||''))
          ];
        });
        pendingRev.forEach(function(x){
          tr.unshift([
            '<span class="num mut">待处理</span>',
            '<span class="m">'+(x['SKU']||'')+'</span><div class="dim" style="font-size:11px;color:var(--t-4)">生成未完成，去补全资料后重提</div>',
            x['目标市场']||'—',
            chip('待处理','warn'),
            String(x['处理时间']||'—').slice(0,16).replace('T',' '),
            btn('编辑重提','','gen-new',(x['SKU']||''))
          ]);
        });
        var note = pendingRev.length ? '顶部 ' + pendingRev.length + ' 条为生成未完成的任务（去「编辑重提」补全资料后重新生成）。' : '';
        el.innerHTML = pagedTable(['记录ID','标题','站点','状态','时间',''], tr, 20, 'rev-list-all') + (note ? '<div style="margin-top:8px;font-size:12px;color:var(--t-3)">' + note + '</div>' : '');
      }
      Promise.all([API.table('定稿输出表', {}, 200), API.table('SKU_输入表', {}, 200)]).then(function(rs){
        var el = document.getElementById('rev-data');
        if (!el) return;
        var rows = (rs[0].ok && rs[0].data && rs[0].data.data) ? rs[0].data.data : [];
        rows = rows.filter(function(x){ return x && x['记录ID']; });
        var skuRows = (rs[1].ok && rs[1].data && rs[1].data.data) ? rs[1].data.data : [];
        var doneSku = {};
        rows.forEach(function(x){ if (x['SKU']) doneSku[x['SKU']] = 1; });
        var pendingRev = skuRows.filter(function(x){ var st = String(x['处理状态']||'').toUpperCase(); return (st === 'REVIEW_REQUIRED' || st === 'FAILED') && x['SKU'] && !doneSku[x['SKU']]; });
        if (!rows.length && !pendingRev.length){ el.innerHTML = callout('warn','还没有文案','生成任务完成后，文案会出现在这里。'); return; }
        renderList(rows, pendingRev);
        var sb = document.getElementById('rev-search-btn');
        if (sb) sb.onclick = function(){
          var q = ((document.querySelector('.tb .inp')||{}).value || '').trim().toLowerCase();
          var pr = pendingRev.filter(function(x){ return !q || String(x['SKU']||'').toLowerCase().indexOf(q)>=0; });
          renderList(q ? rows.filter(function(x){ return String(x['Title']||'').toLowerCase().indexOf(q)>=0 || String(x['SKU']||'').toLowerCase().indexOf(q)>=0; }) : rows, pr);
        };
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
    var el = toolbar(
      [inp('搜索 SKU 或标题'), sel('全部站点',['US','GB','FR','IT','ES'])],
      ['<button class="btn btn--ghost" id="rd-search-btn">查询</button>']
    ) + '<div id="rev-detail-root">' + ghost('正在加载文案详情…') + '</div>';
    setTimeout(function(){
            function loadDetail(){
        var root = document.getElementById('rev-detail-root');
        if (root) root.innerHTML = ghost('正在加载文案详情…');
        var q = ((document.querySelector('.tb .inp')||{}).value || '').trim();
        var mkt = (document.querySelector('.tb .sel')||{}).value || '';
        var flt = (window.CUR_SKU && !q) ? {SKU: window.CUR_SKU} : {};
        API.table('定稿输出表', flt, 200).then(function(r){
          if (!root) return;
          if (!r.ok || !r.data || r.data.success === false) {
            root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return;
          }
          var rows = (r.data.data||[]).filter(function(x){ return x && x['Title']; });
          if (q){ var ql = q.toLowerCase(); rows = rows.filter(function(x){ return String(x['SKU']||'').toLowerCase().indexOf(ql) >= 0 || String(x['Title']||'').toLowerCase().indexOf(ql) >= 0; }); }
          if (mkt && mkt !== '全部站点'){ rows = rows.filter(function(x){ return x['目标市场'] === mkt; }); }
          if (!rows.length) { root.innerHTML = callout('warn','没有匹配的文案','换个 SKU 或站点试试，或去 4.1 看全部文案。'); return; }
          rows.sort(function(a,b){
            var ta = String(a['生成时间']||''), tb = String(b['生成时间']||'');
            return ta < tb ? 1 : (ta > tb ? -1 : 0);
          });
          var x = rows[0];
        var sku = x['SKU'] || window.CUR_SKU || '';
        function cpBtn(t){ return btn('复制','',null,null,t); }
        var bullets = ['Bullet 1','Bullet 2','Bullet 3','Bullet 4','Bullet 5'];
        var bm = bullets.map(function(b){
          var t = x[b]||'';
          return copybox('五点描述 · ' + b, t, '<b>' + (x[b+'字符数']||String(t).length) + '</b> 字符', cpBtn(t));
        }).join('');
        var cn = bullets.map(function(b){
          var v = x[b+'中文对照'];
          return v ? '<b>'+b+'</b>：'+v : '';
        }).filter(Boolean).join('<br>');
        var full = [
          x['Title']||'', x['Highlights']||'',
          x['Bullet 1']||'', x['Bullet 2']||'', x['Bullet 3']||'', x['Bullet 4']||'', x['Bullet 5']||'',
          x['Backend Search Terms']||''
        ].filter(Boolean).join('\n\n');
        root.innerHTML =
          '<div class="cols c21">' +
            '<div>' +
              copybox('标题 Title', x['Title']||'', '<b>'+(x['Title字符数']||'')+'</b> 字符', cpBtn(x['Title']||'')) +
              copybox('亮点 Highlights', x['Highlights']||'', '<b>'+(x['Highlights字符数']||'')+'</b> 字符' + (x['Highlights短语数']?' · '+x['Highlights短语数']+' 个短语':''), cpBtn(x['Highlights']||'')) +
              bm +
              copybox('后台搜索词 Backend', x['Backend Search Terms']||'', '<b>'+(x['Backend字节数']||'')+'</b> 字节', cpBtn(x['Backend Search Terms']||''), true) +
            '</div>' +
            '<div>' +
              panel('这套文案是怎么来的', kv([
                ['商品 / 站点', (x['SKU']||'—')+' / '+(x['目标市场']||'—')],
                ['任务编号', x['运行ID']||'—'],
                ['文案版本', x['定稿版本号']||'—'],
                ['生成时间', bjTime(x['生成时间'])],
              ]), {sub:'出问题时按这几项就能复现'}) +
              panel('中文对照（仅供核对，不要上架）', '<div style="font-size:13px;color:var(--t-2);line-height:1.7">' +
                '<b>标题</b>：'+(x['Title中文对照']||'—')+'<br><br>' +
                '<b>亮点</b>：'+(x['Highlights中文对照']||'—') + (cn?'<br><br>'+cn:'') +
                '</div>') +
              '<div class="btnrow">'+btn('看检查报告','btn','rev-audit',sku)+btn('看选词记录','','rev-ledger',sku)+btn('整套复制','',null,null,full)+'</div>' +
            '</div>' +
          '</div>';
      });
      }
      loadDetail();
      var sb = document.getElementById('rd-search-btn'); if (sb) sb.onclick = loadDetail;
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
            var passN = 0, failN = 0;
            asrts.forEach(function(a){ var at = String(a.status||'').toUpperCase(); if (at==='PASS'||at==='PASS_WITH_NOTES') passN++; else if (at.indexOf('FAIL')===0) failN++; });
            var summaryLine = '共 ' + asrts.length + ' 项检查：' + passN + ' 通过，' + failN + ' 不通过' + (asrts.length-passN-failN ? ('，' + (asrts.length-passN-failN) + ' 未验证') : '');
            var rows = asrts.map(function(a){
              var at = String(a.status || '').toUpperCase();
              var tt = (at === 'PASS' || at === 'PASS_WITH_NOTES') ? 'ok' : (at.indexOf('FAIL') === 0 ? 'fail' : 'warn');
              var c = chip(a.status || '—', tt);
              var desc = String(a.desc || '—');
              if (at === 'FAIL' || at === 'WARN') {
                desc += '<div class="dim" style="font-size:11px;color:var(--t-4);margin-top:2px">实际：' + String(a.actual || '—').slice(0,80) + '<br>期望：' + String(a.expected || '—').slice(0,80) + '</div>';
              }
              return [ desc, c ];
            });
            return head + '<details style="margin-top:6px"><summary style="cursor:pointer;font-size:13px;color:var(--t-2);user-select:none">' + summaryLine + '（点开看明细）</summary><div style="margin-top:8px">' + table(['检查内容','结论'], rows) + '</div></details>';
          }
          var keys = Object.keys(o).filter(function(k){ var vv = o[k]; return vv === null || (typeof vv !== 'object'); });
          if (!keys.length) return table(['结论'], [[String(v || '—')]]);
          return head + table(['检查项','结论'], keys.map(function(k){ return [k, String(o[k])]; }));
        }
        return table(['结论'], [[String(v || '—')]]);
      }
      function loadAudit(){
        var root = document.getElementById('rev-audit-root');
        if (root) root.innerHTML = ghost('正在加载检查报告…');
        var q = ((document.querySelector('.tb .inp')||{}).value || '').trim();
        var mkt = (document.querySelector('.tb .sel')||{}).value || '';
        API.table('证书表', {}, 200).then(function(r){
          if (!root) return;
          if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
          var rows = (r.data.data||[]).filter(function(x){ return x && x['运行ID']; });
          if (q){ var ql = q.toLowerCase(); rows = rows.filter(function(x){ return String(x['SKU']||'').toLowerCase().indexOf(ql) >= 0; }); }
          if (mkt && mkt !== '全部站点'){ rows = rows.filter(function(x){ return x['目标市场'] === mkt; }); }
          if (!rows.length) { root.innerHTML = callout('warn','没有匹配的检查报告','换个 SKU 或站点试试。'); return; }
          rows.sort(function(a,b){ var ta=String(a['生成时间']||''), tb=String(b['生成时间']||''); return ta<tb?1:(ta>tb?-1:0); });
          var x = rows[0];
          var certCols = Object.keys(x).filter(function(k){ return k.indexOf('证书') >= 0 && k !== '全部通过'; });
          var certTitles = {
            '完整性证书':'<span style="color:var(--g-600);font-size:16px;font-weight:700">① 完整性检查</span>',
            '处理证书':'<span style="color:var(--g-600);font-size:16px;font-weight:700">② 处理与合规检查</span>',
            '字段证书':'<span style="color:var(--g-600);font-size:16px;font-weight:700">③ 字段检查</span>',
            '质量证书':'<span style="color:var(--g-600);font-size:16px;font-weight:700">④ 质量检查</span>',
            '审计证书':'<span style="color:var(--g-600);font-size:16px;font-weight:700">⑤ 审计与来源检查</span>'
          };
          var passed = String(x['全部通过']||'').toUpperCase() === 'TRUE';
          var passSummary = certCols.map(function(col){
            var v = x[col];
            var o = null; try { o = JSON.parse(v); } catch(e){ o = null; }
            var st = '', pn = 0, tt = 0;
            if (o && typeof o === 'object'){ st = String(o.status || ''); var sm = o.summary || {}; pn = sm.passed || 0; tt = sm.total || 0; }
            var stUp = st.toUpperCase();
            var tone = (stUp === 'PASS' || stUp === 'PASS_WITH_NOTES') ? 'ok' : (stUp.indexOf('FAIL') === 0 ? 'fail' : 'warn');
            return [certTitles[col] || col, chip(st || '—', tone), '<b>' + pn + '</b> / ' + tt];
          });
          root.innerHTML =
            stats([
              ['是否通过', passed ? '是' : '否', '五证书全 PASS 才为是', passed?'ok':'fail', false],
              ['证书数量', String(certCols.length), '', '', false],
              ['站点', x['目标市场']||'—', '', '', false],
              ['商品名称', '<span style="font-size:12px;font-weight:400">'+(x['SKU']||'—')+'</span>', '', '', false],
              ['生成时间', '<span style="font-size:12px;font-weight:400">'+bjTime(x['生成时间'])+'</span>', '', '', false],
            ], 5) +
            toolbar([inp('搜索 SKU') + ' ' + sel('全部站点',['US','GB','FR','IT','ES']) + ' <button class="btn" id="rd-audit-search" style="margin-left:6px">查询</button>'], []) +
            panel('证书通过概况（通过数 / 总数）', table(['证书','结论','通过 / 总数'], passSummary), {flush:true}) +
            certCols.map(function(col){ return panel(certTitles[col] || col, verdict(x[col]), {flush:true}); }).join('');
        });
      }
      loadAudit();
      var sb = document.getElementById('rd-audit-search'); if (!sb){ sb = document.querySelector('.tb button.btn'); } if (sb) sb.onclick = loadAudit;
    }, 0);
    return el;
  }
});

page('rev-ledger', {
  roles:['运营','审核','管理员'],
  guide:[
    '这一页记录<b>每一个候选词的下落</b>：进了哪个字段、承担什么任务、为什么被拒。',
    '「证据」列的彩色<b>数字</b>表示这个词的依据来自哪里（1 事实 / 2 市场 / 3 账户 / 4 反查），<b>鼠标停上去有说明</b>。',
    '想知道「为什么这个词没进标题」，用上面「去向」筛<b>「被拒绝」</b>，理由都写在最后一列。'
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
    var el = toolbar([sel('全部',['US','GB']), sel('全部',['进标题','进亮点','进五点/后台','被拒绝'])], []) + '<div id="rev-ledger-root">' + ghost('正在加载候选台账…') + '</div>';
    setTimeout(function(){
            function loadLedger(){
        var root = document.getElementById('rev-ledger-root');
        if (root) root.innerHTML = ghost('正在加载候选台账…');
        var sels = document.querySelectorAll('.tb .sel');
        var mkt = (sels[0]||{}).value || '';
        var dest = (sels[1]||{}).value || '';
        API.table('候选台账', {}, 200).then(function(r){
          if (!root) return;
          if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
          var rows = (r.data.data||[]).filter(function(x){ return x && x['候选ID']; });
          function has(v, kw){ return String(v||'').indexOf(kw) >= 0; }
          if (mkt && mkt !== '全部'){ rows = rows.filter(function(x){ return x['目标市场'] === mkt; }); }
          if (dest && dest !== '全部'){
            if (dest === '进标题') rows = rows.filter(function(x){ return has(x['字段决策'],'标题'); });
            else if (dest === '进亮点') rows = rows.filter(function(x){ return has(x['字段决策'],'亮点'); });
            else if (dest === '进五点/后台') rows = rows.filter(function(x){ return has(x['字段决策'],'五点')||has(x['字段决策'],'后台'); });
            else if (dest === '被拒绝') rows = rows.filter(function(x){ return has(x['字段决策'],'拒绝'); });
          }
          if (!rows.length){ root.innerHTML = callout('warn','没有匹配的候选词','换个筛选条件试试。'); return; }
          var intoTitle = rows.filter(function(x){ return has(x['字段决策'],'标题'); }).length;
          var intoHL = rows.filter(function(x){ return has(x['字段决策'],'亮点'); }).length;
          var intoBackend = rows.filter(function(x){ return has(x['字段决策'],'五点')||has(x['字段决策'],'后台'); }).length;
          var rejected = rows.filter(function(x){ return has(x['字段决策'],'拒绝'); }).length;
          function evNum(flags){
            var map = {'F':['ev--f','商品事实表'], 'A':['ev--a','卖家精灵市场数据'], 'S':['ev--s','账户SQP数据'], 'R':['ev--r','竞品反查']};
            var num = {'F':'1','A':'2','S':'3','R':'4'};
            var s0 = String(flags||'');
            return '<span class="ev">' + s0.split('').filter(function(c){return map[c];}).map(function(c){ return '<i class="'+map[c][0]+'" title="'+num[c]+' · '+map[c][1]+'">'+num[c]+'</i>'; }).join('') + '</span>';
          }
          root.innerHTML =
            stats([
              ['候选词总数', rows.length, '', ' ', false],
              ['进了标题', intoTitle, '拒绝 '+rejected, 'ok', false],
              ['进了亮点', intoHL, '', ' ', false],
              ['下沉到五点/后台', intoBackend, '', ' ', false],
              ['被拒绝', rejected, '每条都有理由', '', false],
            ], 5) +
            panel('候选词台账（'+rows.length+' 条）', pagedTable(
              ['候选词','类型','证据','字段决策','目的地理由','最终状态'],
              rows.map(function(x){ return [
                '<span class="m">'+(x['表面文本']||'')+'</span>',
                x['候选类型']||'—',
                evNum(x['证据标志']),
                chip(x['字段决策']||'', has(x['字段决策'],'拒绝')?'fail':(has(x['字段决策'],'标题')?'ok':'')),
                x['目的地理由']||'—',
                chip(x['最终状态']||'', x['最终状态']==='被拒绝'?'fail':'ok')
              ]; })
            ), {flush:true});
        });
      }
      loadLedger();
      var ls = document.querySelectorAll('.tb .sel');
      Array.prototype.forEach.call(ls, function(s){ s.onchange = loadLedger; });
    }, 0);
    return el;
  }
});

page('rev-action', {
  roles:['审核','管理员'],
  guide:[
    '先看检查报告，再决定<b>放行</b>还是<b>打回</b>。打回时要指定改哪个字段，系统只重做那一个。',
    '如果你认为系统判错了某个词，可以「<b>人工改判</b>」，但<b>必须写理由</b>——理由会存进台账。',
    '「人工改判」适用场景：系统判这个词该进/不该进标题，但你基于运营经验认为判错了（比如系统漏了某个高转化词）。改判后系统自动重跑检查。',
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
      API.table('定稿输出表', {}, 200).then(function(r){
        var root = document.getElementById('rev-action-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['SKU'] && String(x['准备发布']||'').toUpperCase() !== 'TRUE'; });
        var head = rows.length ? ('待审核 · ' + rows[0]['SKU'] + ' / ' + (rows[0]['目标市场']||'—') + ' / v' + (rows[0]['定稿版本号']||'1')) : '暂无待审核文案';
        var body0 = rows.length ? '五项检查已完成。你放行之后，运营复制上架，再回来登记 ASIN，这条商品才进入效果跟踪。' : '当前没有待审核的定稿文案。';
        root.innerHTML = callout('', head, body0) + (rows.length ? '<div class="btnrow" style="margin:12px 0"><button class="btn" id="rel-all-btn" style="background:var(--g-600);color:#fff;border:none;font-weight:600">一键放行全部待审核</button></div>' : '') +
          '<div class="cols c2">' +
            panel('放行 / 打回', '<div class="form">'+
              fld('你的结论', pick(['放行','打回 · 让运营补商品资料','打回 · 只重做某个字段','转人工处理'])) +
              fld('打回哪个字段（选了打回才需要填）', pick(['—','标题','亮点','五点描述','后台搜索词'])) +
              fld('审核意见', '<textarea class="ctl" rows="4" placeholder="写给下一个人看的，会存进操作记录"></textarea>') +
            '</div><div class="btnrow" style="margin-top:14px">'+btn('提交结论','btn','','','','提交结论功能暂未开放')+'</div>') +
            panel('待审核列表', pagedTable(['SKU','站点','定稿版本',''], rows.map(function(x){ return ['<span class="m">'+(x['SKU']||'')+'</span>', x['目标市场']||'—', 'v'+(x['定稿版本号']||'1'), btn('审核','btn','rev-action',(x['SKU']||''))]; })), {flush:true}) +
          '</div>' +
          callout('info','人工改判','人工改判选词结论需要接入候选台账写接口，当前暂未开放。');
      });
      var ra = document.getElementById('rel-all-btn'); if (ra) ra.onclick = function(){ toast('放行接口暂未接入，请联系管理员'); };
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
            API.table('运行日志表', {}, 200).then(function(r){
        var root = document.getElementById('rev-manual-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) {
          root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return;
        }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['运行ID'] && String(x['最终状态']||'').toUpperCase() === 'REVIEW_REQUIRED'; });
        if (!rows.length) { root.innerHTML = callout('warn','暂无数据','当前没有需要人工处理的任务。'); return; }
        rows.sort(function(a,b){ var ta=String(a['结束时间']||''), tb=String(b['结束时间']||''); return ta<tb?1:(ta>tb?-1:0); });
        root.innerHTML =
          panel('需人工处理（' + rows.length + ' 条）', pagedTable(
            ['运行ID','商品/站点','最终状态','错误详情','结束时间',''],
            rows.map(function(x){
              return [
                '<span class="m">'+(x['运行ID']||'—')+'</span>',
                (x['SKU']||'—')+' / '+(x['目标市场']||'—'),
                chip('需人工处理','warn'),
                '<span style="font-size:12px">' + errorCn(x['错误详情']) + '</span>',
                '<span class="m">'+bjTime(x['结束时间'])+'</span>',
                btn('认领','btn','','','','认领功能暂未开放')
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
    function pageParam(){ var h = (location.hash || '').replace(/^#/, ''); var idx = h.indexOf('/'); return idx >= 0 ? decodeURIComponent(h.slice(idx + 1)) : ''; }
    var preMkt = pageParam();
    var el = toolbar(['<b style="font-size:12px;color:var(--t-3);margin-right:6px">平台站点：</b><select class="sel" style="max-width:150px"><option>US</option><option>GB</option></select>', '<select class="sel" style="max-width:260px;margin-left:16px"><option>全部</option></select>'], []) + '<div id="data-kw-root">' + ghost('正在加载词库…') + '</div>';
    setTimeout(function(){
            function loadKw(){
        var root = document.getElementById('data-kw-root');
        if (root) root.innerHTML = ghost('正在加载词库…');
        var sels = document.querySelectorAll('.tb .sel');
        if (preMkt && sels[0]) sels[0].value = preMkt;
        var mkt = (sels[0]||{}).value || 'US';
        var snapId = (sels[1]||{}).value || '全部';
        var sheet = (mkt === 'GB') ? '站点词库_GB' : '站点词库_US';
        API.table(sheet, {}, 200).then(function(r){
          if (!root) return;
          if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
          var all = (r.data.data||[]).filter(function(x){ return x && x['关键词']; });
          var snap = {};
          all.forEach(function(x){ if (x['所属类目']) snap[x['所属类目']] = 1; });
          var ids = Object.keys(snap);
          // 更新快照下拉
          var sel2 = sels[1];
          if (sel2){ var cur = snapId; sel2.innerHTML = '<option value="全部">全部（'+ids.length+' 个快照）</option>' + ids.map(function(id){ return '<option value="'+id+'"'+(id===cur?' selected':'')+'>'+id+'</option>'; }).join(''); }
          var rows = all;
          if (snapId && snapId !== '全部'){ rows = rows.filter(function(x){ return x['所属类目'] === snapId; }); }
          if (!rows.length){ root.innerHTML = callout('warn','该快照暂无关键词','换个快照或站点试试。'); return; }
          root.innerHTML =
            panel('类目清单（' + ids.length + ' 个）', '<div style="font-size:13px;color:var(--t-2)">上方下拉里选类目，下方显示该类目的关键词。当前：<b>'+snapId+'</b>（'+mkt+' · '+rows.length+' 词）</div>') +
            panel('关键词列表（'+rows.length+' 条）', pagedTable(
              ['关键词','关键词翻译','月搜索量','购买率','相关度','需供比'],
              rows.map(function(x){ return [
                '<span class="m">'+(x['关键词']||'')+'</span>',
                x['关键词翻译']||'—',
                x['月搜索量']||'—',
                x['购买率']||'—',
                x['相关度']||'—',
                x['需供比']||'—'
              ]; })
            ), {flush:true});
        });
      }
      loadKw();
      var kws = document.querySelectorAll('.tb .sel');
      Array.prototype.forEach.call(kws, function(s){ s.onchange = loadKw; });
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
    function pageParam(){ var h = (location.hash || '').replace(/^#/, ''); var idx = h.indexOf('/'); return idx >= 0 ? decodeURIComponent(h.slice(idx + 1)) : ''; }
    var preMkt = pageParam();
    var el = toolbar(['<b style="font-size:12px;color:var(--t-3);margin-right:6px">平台站点：</b><select class="sel" style="max-width:150px"><option>US</option><option>DE</option><option>GB</option></select>', '<b style="font-size:12px;color:var(--t-3);margin:0 6px 0 16px">数据周期：</b><select class="sel" style="max-width:180px"><option>全部</option></select>'], []) + '<div id="data-ppc-root">' + ghost('正在加载 PPC / SQP 数据…') + '</div>';
    setTimeout(function(){
      function loadPpc(){
        var root = document.getElementById('data-ppc-root');
        if (!root) return;
        root.innerHTML = ghost('正在加载 PPC / SQP 数据…');
        var sels = document.querySelectorAll('.tb .sel');
        if (preMkt && sels[0]) sels[0].value = preMkt;
        var mkt = (sels[0]||{}).value || 'US';
        var date = (sels[1]||{}).value || '全部';
        var ppcSheet = (mkt === 'US') ? 'PPC出单词_US' : (mkt === 'GB' ? 'PPC出单词_GB' : '');
        var sqpSheet = 'SQP_ASIN_' + mkt;
        var jobs = [];
        if (ppcSheet) jobs.push(API.table(ppcSheet, {}, 200).then(function(r){ return {ok:true, r:r}; }, function(){ return {ok:false}; }));
        else jobs.push(Promise.resolve({ok:false, noPpc:true}));
        jobs.push(API.table(sqpSheet, {}, 200).then(function(r){ return {ok:true, r:r}; }, function(){ return {ok:false}; }));
        Promise.all(jobs).then(function(rs){
          var ppc = rs[0], sqp = rs[1];
          var html = '';
          // ── PPC 面板 ──
          if (ppc && ppc.noPpc) {
            html += callout('warn','该站点暂无 PPC 广告数据', mkt + ' 站点目前只导入了搜索表现（SQP ASIN 视图）数据。');
          } else if (ppc && ppc.ok && ppc.r.ok && ppc.r.data && ppc.r.data.success !== false) {
            var all = (ppc.r.data.data||[]).filter(function(x){ return x && x['客户搜索词']; });
            var dates = {};
            all.forEach(function(x){ if (x['报表开始日期']) dates[x['报表开始日期']] = 1; });
            var dlist = Object.keys(dates);
            var sel2 = sels[1];
            if (sel2){ var cur = date; sel2.innerHTML = '<option value="全部">全部（'+dlist.length+' 个日期）</option>' + dlist.map(function(d){ return '<option value="'+d+'">'+d+'</option>'; }).join(''); sel2.value = cur; }
            var rows = all;
            if (date && date !== '全部'){ rows = rows.filter(function(x){ return x['报表开始日期'] === date; }); }
            var clicks = rows.reduce(function(s,x){ return s + (parseInt(x['点击']||'0',10)||0); }, 0);
            var orders = rows.reduce(function(s,x){ return s + (parseInt(x['订单']||'0',10)||0); }, 0);
            var spend = rows.reduce(function(s,x){ return s + (parseFloat(x['花费']||'0')||0); }, 0);
            function f3(v){ var n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(3); }
            html += panel('PPC 出单词（' + mkt + ' · ' + dlist.length + ' 个日期）', '<div style="font-size:13px;color:var(--t-2)">广告报告：上方下拉选报表日期，下方显示该日期出单词。当前：<b>'+date+'</b> · '+rows.length+' 词</div>' + kv([['出单词总数（当前筛选）', rows.length],['点击合计', clicks],['订单合计', orders],['花费合计', '$' + spend.toFixed(2)]]) + pagedTable(['客户搜索词','广告活动','曝光','点击','花费','订单','ACOS'], rows.map(function(x){ return ['<span class="m">'+(x['客户搜索词']||'')+'</span>', x['广告活动名称']||'—', x['曝光']||'—', x['点击']||'—', x['花费']||'—', x['订单']||'—', '<span class="num">'+f3(x['ACOS'])+'</span>']; })), {flush:true});
          } else {
            html += callout('warn','PPC 数据暂不可用', '读取 PPC 出单词表失败，可能尚未导入或授权过期。');
          }
          // ── SQP ASIN 份额面板 ──
          if (sqp && sqp.ok && sqp.r.ok && sqp.r.data && sqp.r.data.success !== false) {
            var rows2 = (sqp.r.data.data||[]).filter(function(x){ return x && x['搜索查询']; });
            if (!rows2.length) {
              html += callout('warn','该站点暂无搜索表现数据', 'SQP ASIN 视图尚未导入 ' + mkt + ' 站点数据。');
            } else {
              var brands = {}; rows2.forEach(function(x){ if (x['品牌名']) brands[x['品牌名']] = 1; });
              var bnames = Object.keys(brands);
              function f4(v){ var n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(3); }
              var cols2 = ['搜索查询','查询总量','曝光总量','ASIN曝光份额','ASIN购买份额','ASIN','报表开始日期'];
              html += panel('搜索表现 · ASIN 份额（SQP_ASIN_' + mkt + ' · ' + rows2.length + ' 条）', '<div style="font-size:13px;color:var(--t-2)">搜索查询绩效 ASIN 视图（' + (bnames.length ? bnames.join(' / ') : mkt) + '）。点表头可排序。ASIN 购买份额 > 0 = 该 ASIN 已占住的入口。</div>' + pagedTable(cols2, rows2.map(function(x){ return ['<span class="m">'+(x['搜索查询']||'—')+'</span>', '<span class="num">'+String(x['查询总量']||'—')+'</span>', '<span class="num">'+String(x['曝光总量']||'—')+'</span>', '<span class="num">'+f4(x['ASIN曝光份额'])+'</span>', '<span class="num">'+f4(x['ASIN购买份额'])+'</span>', '<span class="m">'+(x['ASIN']||'—')+'</span>', x['报表开始日期']||'—']; })), {flush:true});
            }
          } else {
            html += callout('warn','搜索表现数据暂不可用', '读取 SQP_ASIN_' + mkt + ' 失败。');
          }
          root.innerHTML = html;
          // 表头排序（两块表格都启用）
          var curSort = {}, curDesc = {};
          Array.prototype.forEach.call(root.querySelectorAll('th'), function(th){
            th.style.cursor = 'pointer';
            th.onclick = function(){
              var tbl = th.closest('table'); if (!tbl) return;
              var head = Array.prototype.map.call(tbl.querySelectorAll('thead th, tr:first-child th'), function(h){ return h.textContent; });
              var ci = Array.prototype.indexOf.call(tbl.querySelectorAll('thead th, tr:first-child th'), th);
              if (!(tbl in curSort)) { curSort[tbl] = ''; curDesc[tbl] = true; }
              if (curSort[tbl] === head[ci]) curDesc[tbl] = !curDesc[tbl]; else { curSort[tbl] = head[ci]; curDesc[tbl] = true; }
              var key = curSort[tbl]; var desc = curDesc[tbl];
              var tbody = tbl.querySelector('tbody'); if (!tbody) return;
              var trs = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
              trs.sort(function(a,b){
                var av = a.children[ci] ? a.children[ci].textContent.trim() : '';
                var bv = b.children[ci] ? b.children[ci].textContent.trim() : '';
                var an = parseFloat(av.replace(/[$,\s]/g,'')), bn = parseFloat(bv.replace(/[$,\s]/g,''));
                if (!isNaN(an) && !isNaN(bn)) return desc ? bn - an : an - bn;
                return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
              });
              trs.forEach(function(tr){ tbody.appendChild(tr); });
            };
          });
        });
      }
      loadPpc();
      var pps = document.querySelectorAll('.tb .sel');
      Array.prototype.forEach.call(pps, function(s){ s.onchange = loadPpc; });
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
          panel('广告组对应关系（'+rows.length+' 条）', pagedTable(
            ['广告活动名称','广告组名称','SKU列表','SKU数量','站点','映射置信度','核对日期'],
            rows.map(function(x){ return [
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
    var el = toolbar([inp('搜索查询词')], []) + '<div id="data-aba-root">' + ghost('正在加载品牌份额数据…') + '</div>';
    setTimeout(function(){
            var sortCol = '查询总量', sortDesc = true;
      function loadAba(){
        var root = document.getElementById('data-aba-root');
        if (root) root.innerHTML = ghost('正在加载品牌份额数据…');
        var q = ((document.querySelector('.tb .inp')||{}).value || '').trim();
        API.table('SQP_US', {}, 200).then(function(r){
          if (!root) return;
          if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
          var rows = (r.data.data||[]).filter(function(x){ return x && x['搜索查询']; });
          if (q){ var ql = q.toLowerCase(); rows = rows.filter(function(x){ return String(x['搜索查询']||'').toLowerCase().indexOf(ql) >= 0; }); }
          if (!rows.length) { root.innerHTML = callout('warn','没有匹配的查询','换个关键词试试。'); return; }
          rows.sort(function(x,y){ var vx = parseFloat(x[sortCol])||0, vy = parseFloat(y[sortCol])||0; return sortDesc ? vy-vx : vx-vy; });
          function f3(v){ var n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(3); }
          var cols = ['搜索查询','查询总量','曝光总量','品牌曝光份额','品牌购买份额'];
          root.innerHTML = panel('品牌份额（SQP_US · 共 ' + rows.length + ' 条）', pagedTable(cols,
            rows.map(function(x){ return [
              '<span class="m">'+(x['搜索查询']||'—')+'</span>',
              '<span class="num">'+String(x['查询总量']||'—')+'</span>',
              '<span class="num">'+String(x['曝光总量']||'—')+'</span>',
              '<span class="num">'+f3(x['品牌曝光份额'])+'</span>',
              '<span class="num">'+f3(x['品牌购买份额'])+'</span>'
            ]; })
          ), {flush:true, note:'点表头可排序；曝光/购买份额保留 3 位小数。数据来自亚马逊官方「搜索查询绩效」品牌视图。'});
          Array.prototype.forEach.call(root.querySelectorAll('th'), function(th, i){
            th.style.cursor = 'pointer';
            th.onclick = function(){ if (sortCol === cols[i]) sortDesc = !sortDesc; else { sortCol = cols[i]; sortDesc = true; } loadAba(); };
          });
        });
      }
      loadAba();
      var abi = document.querySelector('.tb .inp'); if (abi) abi.onchange = loadAba;
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
    function pageParam(){ var h = (location.hash || '').replace(/^#/, ''); var idx = h.indexOf('/'); return idx >= 0 ? decodeURIComponent(h.slice(idx + 1)) : ''; }
    var preMkt = pageParam();
    var el = toolbar(['<b style="font-size:12px;color:var(--t-3);margin-right:6px">平台站点：</b><select class="sel" style="max-width:130px"><option>US</option><option>DE</option><option>GB</option></select>', inp('搜索查询词')], []) + '<div id="data-opp-root">' + ghost('正在加载 ASIN 份额数据…') + '</div>';
    setTimeout(function(){
            var sortCol = '查询总量', sortDesc = true;
      function loadOpp(){
        var root = document.getElementById('data-opp-root');
        if (root) root.innerHTML = ghost('正在加载 ASIN 份额数据…');
        var sels = document.querySelectorAll('.tb .sel');
        if (preMkt && sels[0]) sels[0].value = preMkt;
        var mkt = (sels[0]||{}).value || 'US';
        var q = ((document.querySelector('.tb .inp')||{}).value || '').trim();
        API.table(mkt === 'US' ? 'SQP_ASIN_US' : (mkt === 'DE' ? 'SQP_ASIN_DE' : 'SQP_ASIN_GB'), {}, 200).then(function(r){
          if (!root) return;
          if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
          var rows = (r.data.data||[]).filter(function(x){ return x && x['搜索查询']; });
          if (q){ var ql = q.toLowerCase(); rows = rows.filter(function(x){ return String(x['搜索查询']||'').toLowerCase().indexOf(ql) >= 0; }); }
          if (!rows.length) { root.innerHTML = callout('warn','没有匹配的查询','换个关键词试试。'); return; }
          rows.sort(function(x,y){ var vx = parseFloat(x[sortCol])||0, vy = parseFloat(y[sortCol])||0; return sortDesc ? vy-vx : vx-vy; });
          function f3(v){ var n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(3); }
          var cols = ['搜索查询','查询总量','ASIN曝光份额','ASIN购买份额','ASIN'];
          root.innerHTML = panel('ASIN 份额（' + mkt + ' · 共 ' + rows.length + ' 条）', pagedTable(cols,
            rows.map(function(x){ return [
              '<span class="m">'+(x['搜索查询']||'—')+'</span>',
              '<span class="num">'+String(x['查询总量']||'—')+'</span>',
              '<span class="num">'+f3(x['ASIN曝光份额'])+'</span>',
              '<span class="num">'+f3(x['ASIN购买份额'])+'</span>',
              '<span class="m">'+(x['ASIN']||'—')+'</span>'
            ]; })
          ), {flush:true, note:'点表头可排序；份额保留 3 位小数。ASIN 购买份额 > 0 的查询即该 ASIN 已占住的入口。'});
          Array.prototype.forEach.call(root.querySelectorAll('th'), function(th, i){
            th.style.cursor = 'pointer';
            th.onclick = function(){ if (sortCol === cols[i]) sortDesc = !sortDesc; else { sortCol = cols[i]; sortDesc = true; } loadOpp(); };
          });
        });
      }
      loadOpp();
      var opi = document.querySelector('.tb .inp'); if (opi) opi.onchange = loadOpp;
      var ops = document.querySelectorAll('.tb .sel');
      Array.prototype.forEach.call(ops, function(s){ s.onchange = loadOpp; });
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
    var el = '<div id="data-grade-root">' + ghost('正在加载评级数据…') + '</div>';
    setTimeout(function(){
      var root = document.getElementById('data-grade-root');
      if (!root) return;
      Promise.all([
        API.table('站点词库_US', {}, 200), API.table('站点词库_GB', {}, 200)
      ]).then(function(rs){
        var kwUS = (rs[0].ok && rs[0].data) ? (rs[0].data.total||0) : 0;
        var kwGB = (rs[1].ok && rs[1].data) ? (rs[1].data.total||0) : 0;
        root.innerHTML =
          stats([
            ['词库词数', kwUS + kwGB, 'US+GB 合计', '', false],
            ['US 词', kwUS, '', '', false],
            ['GB 词', kwGB, '', '', false],
            ['评级记录', 0, '反馈闭环尚未运行', 'warn', false],
          ], 4) +
          callout('warn','关键词效果评级待数据','评级功能依赖「反馈闭环（周）」产出表现数据。当前闭环尚未运行，暂无升降级建议。闭环跑过之后，这里会展示：哪些词被真实表现验证过、哪些该降级。') +
          panel('词库入口', table(['数据类型','站点','记录数',''],
            [
              ['关键词库','US','<span class="num">'+kwUS+'</span>', btn('查看词库','','data-kw')],
              ['关键词库','GB','<span class="num">'+kwGB+'</span>', btn('查看词库','','data-kw')],
            ]
          ), {flush:true, note:'查看词库内容请点右侧「查看词库」，进入 5.1 词库数据页。'});
      });
    }, 0);
    return el;
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
    var el = '<div id="data-import-root">' + ghost('正在加载导入历史…') + '</div>';
    setTimeout(function(){
      var root = document.getElementById('data-import-root');
      if (!root) return;
      Promise.all([
        API.table('站点词库_US', {}, 200), API.table('站点词库_GB', {}, 200),
        API.table('PPC出单词_US', {}, 200), API.table('PPC出单词_GB', {}, 200),
        API.table('SQP_ASIN_US', {}, 200), API.table('SQP_ASIN_DE', {}, 200), API.table('SQP_ASIN_GB', {}, 200)
      ]).then(function(rs){
        function n(i){ return (rs[i]&&rs[i].ok&&rs[i].data)?(rs[i].data.total||0):0; }
        var items = [
          ['关键词库','US','站点词库_US',n(0),'data-kw'],
          ['关键词库','GB','站点词库_GB',n(1),'data-kw'],
          ['PPC 出单词','US','PPC出单词_US',n(2),'data-ppc'],
          ['PPC 出单词','GB','PPC出单词_GB',n(3),'data-ppc'],
          ['搜索表现 ASIN','US','SQP_ASIN_US',n(4),'data-ppc'],
          ['搜索表现 ASIN','DE','SQP_ASIN_DE',n(5),'data-ppc'],
          ['搜索表现 ASIN','GB','SQP_ASIN_GB',n(6),'data-ppc']
        ];
        var hasSqp = n(4) + n(5) + n(6);
        root.innerHTML = panel('导入历史（' + items.length + ' 个数据源 · 共 ' + items.reduce(function(s,it){return s+it[3];},0) + ' 条记录）', table(
          ['数据类型','站点','数据表','记录数',''],
          items.map(function(it){ return [it[0], it[1], '<span class="m">'+it[2]+'</span>', '<span class="num">'+it[3]+'</span>', btn('查看','',it[4])]; })
        ), {flush:true, note:'关键词库 / PPC 广告 / 搜索表现（SQP ASIN 视图）各自按站点导入。搜索表现数据 2025Q4 精选已导入 DE / US / GB（含圣诞季），查看详情点「查看」。' + (hasSqp ? '' : '')});
      });
    }, 0);
    return el;
  }
});
