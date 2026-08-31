/* ══ 页面组 ⑥系统设置 ⑦上线跟踪 ⑧管理后台 ══ */

/* ───────── ⑥ 系统设置 ───────── */

page('cfg-category', {
  roles:['管理员'],
  guide:[
    '这里定的是<b>每个类目写多长、优先写什么</b>。',
    '<b>改设置不会覆盖旧的</b>——每次改都生成一个新版本，正在跑的任务仍用旧版本，出问题可以一键退回。',
    '「适用人群方向」这一项要特别小心：<b>婴儿床笠和成人商品的方向是相反的</b>。'
  ],
  spec:{
    q:'每个类目的字数预算、优先入口、人群守卫方向是什么。',
    acts:['新建类目','编辑并生成新版本','对比版本','退回旧版本'],
    wf:['无（全链路只读本表）'],
    reads:['category_config'],
    writes:['category_config（插入新版本行，不就地改）','audit_log'],
    limits:[
      '<b>改设置 = 插入新版本，不就地改</b>；在跑的任务用锁定的旧版本',
      '人群守卫方向必须可配：婴儿床笠是「只准婴儿语汇」，与成人款相反',
      '不得把抱枕套的字数目标直接复用到其他类目'
    ]
  },
    body:function(){
    var el = toolbar([], [btn('新增类目','btn','','','','cfg-cat-add')]) + '<div id="cfg-category-root">' + ghost('正在加载类目规则…') + '</div>';
    setTimeout(function(){
      API.table('类目配置', {}, 200).then(function(r){
        var root = document.getElementById('cfg-category-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['类目']; });
        if (!rows.length) { root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }

        function gdir(d){ return d==='INFANT_ONLY'?'warn':(d==='ADULT_ONLY'?'sys':''); }
        root.innerHTML = panel('类目规则（' + rows.length + ' 条）', table(
          ['类目','Title最大字符','Title目标区间','Highlights格式','Highlights短语数','Bullet条数','人群守卫方向','配置版本','更新时间',''],
          rows.map(function(x, i){ return [
            '<span class="m">' + (x['类目']||'—') + '</span>',
            '<span class="num">' + (x['Title最大字符']||'—') + '</span>',
            (x['Title目标最小']||'—') + ' ~ ' + (x['Title目标最大']||'—'),
            x['Highlights格式'] || '—',
            (x['Highlights短语最小数']||'—') + ' ~ ' + (x['Highlights短语最大数']||'—'),
            '<span class="num">' + (x['Bullet条数']||'—') + '</span>',
            chip(x['人群守卫方向']||'未配置', gdir(x['人群守卫方向'])),
            x['配置版本'] || '—',
            '<span class="m">' + String(x['更新时间']||'—').slice(0,10) + '</span>',
            '<button class="btn btn--ghost" data-idx="'+i+'">详情</button>'
           ]; })
        ), {flush:true}) + '<div id="cfg-cat-detail" style="margin-top:14px"></div>';
        Array.prototype.forEach.call(document.querySelectorAll('#cfg-category-root .btn[data-idx]'), function(el){
          el.onclick = function(){
            var i = parseInt(el.getAttribute('data-idx'), 10);
            var x = rows[i];
            var pairs = Object.keys(x).filter(function(k){ return k !== 'row_number' && String(x[k]).trim() !== ''; })
              .map(function(k){ return [k, x[k]]; });
            var grp = [['类目','Title最大字符','Title目标最小','Title目标最大'],['Highlights格式','Highlights短语最小数','Highlights短语最大数'],['Bullet条数','人群守卫方向','配置版本','更新时间']];
            var inner = grp.map(function(g){ var pairs = g.filter(function(k){ return String(x[k]||'').trim()!==''; }).map(function(k){ return ['<span class="m">'+k+'</span>', x[k]]; }); return table(['配置项','值'], pairs); }).join('<div style="height:12px"></div>');
            document.getElementById('cfg-cat-detail').innerHTML = panel('完整配置 · ' + (x['类目']||''), inner, {sub:'按组展示，更紧凑'});
          };
        });
      });
      function openCategoryModal(){
        var fields = [
          fld('类目', '<input class="ctl" id="cat-name" placeholder="如 抱枕套">'),
          fld('Title 最大字符', '<input class="ctl" id="cat-tmax" type="number" value="150">'),
          fld('Title 目标区间', '<div style="display:flex;gap:8px;align-items:center"><input class="ctl" id="cat-tmin" type="number" placeholder="最小" style="flex:1"><span>~</span><input class="ctl" id="cat-tmax2" type="number" placeholder="最大" style="flex:1"></div>'),
          fld('Highlights 格式', '<select class="ctl" id="cat-hfmt"><option>要点式</option><option>短语式</option></select>'),
          fld('Highlights 短语数区间', '<div style="display:flex;gap:8px;align-items:center"><input class="ctl" id="cat-hmin" type="number" placeholder="最小" style="flex:1"><span>~</span><input class="ctl" id="cat-hmax" type="number" placeholder="最大" style="flex:1"></div>'),
          fld('Bullet 条数', '<input class="ctl" id="cat-bullet" type="number" value="5">'),
          fld('人群守卫方向', '<select class="ctl" id="cat-gdir"><option value="">无</option><option value="INFANT_ONLY">INFANT_ONLY · 只准婴儿语汇</option><option value="ADULT_ONLY">ADULT_ONLY · 只准成人语汇</option></select>')
        ];
        openModal('新增类目规则', fields.join(''), function(close){
          var name = (document.getElementById('cat-name')||{}).value || '';
          if (!name){ toast('请填写类目名'); return; }
          var payload = {
            category: name,
            title_max_chars: (document.getElementById('cat-tmax')||{}).value || '',
            title_min: (document.getElementById('cat-tmin')||{}).value || '',
            title_max: (document.getElementById('cat-tmax2')||{}).value || '',
            highlights_format: (document.getElementById('cat-hfmt')||{}).value || '',
            highlights_min: (document.getElementById('cat-hmin')||{}).value || '',
            highlights_max: (document.getElementById('cat-hmax')||{}).value || '',
            bullet_count: (document.getElementById('cat-bullet')||{}).value || '',
            guard_direction: (document.getElementById('cat-gdir')||{}).value || ''
          };
          API.createCategory(payload).then(function(r){
            if (r && r.ok && r.data && r.data.success){ toast('类目已新增'); close(); }
            else { toast((r && r.data && r.data.error) || '新增失败'); }
          });
        }, '保存');
      }
      var catAdd = document.querySelector('#cfg-category-root .btn'); if (!catAdd) catAdd = document.querySelector('.tb .btn'); if (catAdd) catAdd.onclick = openCategoryModal;
    }, 0);
    return el;
  }
});

page('cfg-market', {
  roles:['管理员'],
  guide:[
    '每个站点的<b>后台搜索词字节上限、标点规则、本地禁用词</b>都不一样，必须分别核对。',
    '<b>不要把美国的设置直接套到其他站点</b>——上限可能不同。',
    '「上次复核」超过 90 天会变红，提交生成时会告警。'
  ],
  spec:{
    q:'每个站点的字节上限、标点规则、本地禁用词是什么。',
    acts:['编辑并生成新版本','核对官方规则','对比站点'],
    wf:['无'],
    reads:['marketplace_config','compliance_rules'],
    writes:['marketplace_config','audit_log'],
    limits:[
      '<b>各站点字节上限不得默认沿用美国值</b>，必须分别核对',
      '编造人群词的禁用列表按<b>站点语言</b>本地化（法国需含 femmes/mamans，德国需含 Frauen/Mütter）',
      '它与类目的「适用人群方向」是两件事，不要合并'
    ]
  },
    body:function(){
    var el = toolbar([], [btn('新增站点','btn','','','','cfg-mkt-add')]) + '<div id="cfg-market-root">' + ghost('正在加载站点规则…') + '</div>';
    setTimeout(function(){
      API.table('站点配置', {}, 200).then(function(r){
        var root = document.getElementById('cfg-market-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['站点']; });
        if (!rows.length) { root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        root.innerHTML = panel('站点规则（' + rows.length + ' 条）', table(
          ['站点','语言区域','Backend最大字节','标点策略','分词','复合词','词库表名','合规规则版本','核对日期',''],
          rows.map(function(x, i){ return [
            '<span class="m">' + (x['站点']||'—') + '</span>',
            '<span class="m">' + (x['语言区域']||'—') + '</span>',
            '<span class="num">' + (x['Backend最大字节']||'—') + '</span> 字节',
            x['Title标点策略'] || '—',
            x['分词配置'] || '—',
            x['复合词处理'] || '—',
            x['词库表名'] || '—',
            '<span class="m">' + (x['合规规则版本']||'—') + '</span>',
            '<span class="m">' + String(x['合规规则核对日期']||'—').slice(0,10) + '</span>',
            '<button class="btn btn--ghost" data-idx="'+i+'">详情</button>'
           ]; })
        ), {flush:true}) + '<div id="cfg-market-detail" style="margin-top:14px"></div>';
        Array.prototype.forEach.call(document.querySelectorAll('#cfg-market-root .btn[data-idx]'), function(el){
          el.onclick = function(){
            var i = parseInt(el.getAttribute('data-idx'), 10);
            var x = rows[i];
            var pairs = Object.keys(x).filter(function(k){ return k !== 'row_number' && String(x[k]).trim() !== ''; })
              .map(function(k){ return [k, x[k]]; });
            var grp = [['站点','语言区域','语言名称','Backend最大字节','Backend编码'],['Title标点策略','分词配置','复合词处理'],['站点禁用词','人口属性禁用词'],['词库表名','合规规则版本','合规规则核对日期']];
            var inner = grp.map(function(g){ var pairs = g.filter(function(k){ return String(x[k]||'').trim()!==''; }).map(function(k){ return ['<span class="m">'+k+'</span>', x[k]]; }); return table(['配置项','值'], pairs); }).join('<div style="height:12px"></div>');
            document.getElementById('cfg-market-detail').innerHTML = panel('完整配置 · ' + (x['站点']||''), inner, {sub:'按组展示，更紧凑'});
          };
        });
      });
      function openMarketModal(){
        var fields = [
          fld('站点', '<select class="ctl" id="mkt-code"><option>US</option><option>GB</option><option>FR</option><option>IT</option><option>ES</option><option>DE</option></select>'),
          fld('语言区域', '<input class="ctl" id="mkt-lang" placeholder="如 en_US">'),
          fld('Backend 最大字节', '<input class="ctl" id="mkt-bytes" type="number" value="250">'),
          fld('Title 标点策略', '<select class="ctl" id="mkt-punc"><option>无句末标点</option><option>保留逗号</option><option>全角标点</option></select>'),
          fld('分词配置', '<input class="ctl" id="mkt-token" placeholder="如 空格分词">'),
          fld('复合词处理', '<input class="ctl" id="mkt-compound" placeholder="如 保留复合词">'),
          fld('词库表名', '<input class="ctl" id="mkt-table" placeholder="如 站点词库_US">')
        ];
        openModal('新增站点规则', fields.join(''), function(close){
          var code = (document.getElementById('mkt-code')||{}).value || '';
          var payload = {
            site: code,
            locale: (document.getElementById('mkt-lang')||{}).value || '',
            backend_max_bytes: (document.getElementById('mkt-bytes')||{}).value || '',
            title_punct: (document.getElementById('mkt-punc')||{}).value || '',
            tokenization: (document.getElementById('mkt-token')||{}).value || '',
            compound: (document.getElementById('mkt-compound')||{}).value || '',
            kw_table: (document.getElementById('mkt-table')||{}).value || ''
          };
          API.createMarket(payload).then(function(r){
            if (r && r.ok && r.data && r.data.success){ toast('站点已新增'); close(); }
            else { toast((r && r.data && r.data.error) || '新增失败'); }
          });
        }, '保存');
      }
      var mktAdd = document.querySelector('.tb .btn'); if (mktAdd) mktAdd.onclick = openMarketModal;
    }, 0);
    return el;
  }
});

page('cfg-rules', {
  roles:['管理员'],
  guide:[
    '亚马逊的规则<b>会变</b>，所以这里存的是「某一天核对过的规则快照」，不是固定不变的常量。',
    '复核时把官方页面存档进来，系统会记录版本号和日期。',
    '和 6.1「类目规则」是两回事：6.1 是我们<b>内部给每个类目定的写作目标</b>（字数/优先入口），这里存的是<b>亚马逊官方平台规则</b>（标题上限、图片要求等，会变、要核对）。',
    '<b>规则变了不会自动重写已上架的文案</b>——系统只给你一张「受影响清单」，改不改你定。'
  ],
  spec:{
    q:'亚马逊平台规则的当前快照是什么、什么时候核对的、变更影响了谁。',
    acts:['新建规则版本','上传官方页面存档','生成受影响清单'],
    wf:['规则变更 → 产出受影响 Listing 清单（不自动重写）'],
    reads:['compliance_rules','listing_final'],
    writes:['compliance_rules','audit_log'],
    limits:[
      '亚马逊规则是<b>会过期的输入，不是常量</b>',
      '规则变更<b>不自动重写已上架文案</b>，只产出受影响清单',
      '超过 90 天未复核自动告警'
    ]
  },
    body:function(){
    var el = '<div id="cfg-rules-root">' + ghost('正在加载规则版本…') + '</div>';
    setTimeout(function(){
      API.table('合规规则', {}, 200).then(function(r){
        var root = document.getElementById('cfg-rules-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('warn','暂无平台规则','平台规则数据源尚未接入（合规规则表），请联系管理员。'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && (x['规则']||x['规则名称']||x['标题']); });
        if (!rows.length) { root.innerHTML = callout('warn','暂无平台规则','还没有平台规则快照，核对亚马逊官方规则后录入。'); return; }
        root.innerHTML = panel('平台规则快照（' + rows.length + ' 条）', table(
          ['规则','内容/要求','核对日期','版本',''],
          rows.map(function(x){ return [
            '<span class="m">' + (x['规则']||x['规则名称']||x['标题']||'—') + '</span>',
            x['内容']||x['要求']||x['描述']||'—',
            '<span class="m">' + String(x['核对日期']||x['更新日期']||'—').slice(0,10) + '</span>',
            x['版本']||'—',
            btn('查看','')
          ]; })
        ), {flush:true, note:'这是亚马逊官方平台规则的快照（会过期，需定期核对）。规则变更只产出受影响清单，不自动重写已上架文案。'});
      });
    }, 0);
    return el;
  }
});

page('cfg-forbidden', {
  roles:['管理员'],
  guide:[
    '违禁词分三个风险等级，高风险的会直接拦住不让上架。',
    '注意「匹配方式」：必须是<b>按完整单词匹配</b>，否则 bra 会误伤 embrace 这样的正常词。',
    '停用词条<b>不会真的删掉</b>，保留历史才能复现旧任务当时的判定。'
  ],
  spec:{
    q:'违禁词库当前是什么，各词的风险等级与替换建议。',
    acts:['新增/停用词条','导入 CSV','按站点覆盖'],
    wf:['无（合规检查读取）'],
    reads:['forbidden_word'],
    writes:['forbidden_word','audit_log'],
    limits:['<b>部分匹配是陷阱</b>：bra 会命中 embrace，必须按完整单词匹配','停用词条不删除，保留历史以便复现旧任务的判定']
  },
    body:function(){
    var el = toolbar([sel('全部平台',['通用','US','GB','FR','IT','ES']), sel('全部版本',['全部'])], [btn('导入违禁词','btn','','','','cfg-forb-add')]) + '<div id="cfg-forbidden-root">' + ghost('正在加载违禁词…') + '</div>';
    setTimeout(function(){
            function loadForbidden(){
        var root = document.getElementById('cfg-forbidden-root');
        if (root) root.innerHTML = ghost('正在加载违禁词…');
        var sels = document.querySelectorAll('.tb .sel');
        var plat = (sels[0]||{}).value || '全部平台';
        var ver = (sels[1]||{}).value || '全部版本';
        API.table('违禁词库', {}, 200).then(function(r){
          if (!root) return;
          if (!r.ok || !r.data || r.data.success === false) {
            root.innerHTML = callout('warn','暂无违禁词','违禁词库还是空的（空表），先在数据管理导入违禁词，或联系管理员。'); return;
          }
          var all = (r.data.data||[]).filter(function(x){ return x && x['词条']; });
          if (!all.length){ root.innerHTML = callout('warn','暂无违禁词','违禁词库还是空的，先在数据管理导入违禁词。'); return; }
          // 版本（添加日期）去重
          var vers = {};
          all.forEach(function(x){ var d = String(x['添加日期']||'').slice(0,10); if (d) vers[d] = 1; });
          var vlist = Object.keys(vers);
          var sel2 = sels[1];
          if (sel2){ sel2.innerHTML = '<option value="全部版本">全部版本（'+vlist.length+' 个）</option>' + vlist.map(function(d){ return '<option value="'+d+'"'+(d===ver?' selected':'')+'>'+d+'</option>'; }).join(''); }
          var rows = all;
          if (plat && plat !== '全部平台'){ rows = rows.filter(function(x){ return (x['站点']||'通用') === plat || (plat==='通用' && !x['站点']); }); }
          if (ver && ver !== '全部版本'){ rows = rows.filter(function(x){ return String(x['添加日期']||'').slice(0,10) === ver; }); }
          if (!rows.length){ root.innerHTML = callout('warn','该筛选下没有违禁词','换个平台或版本试试。'); return; }
          function ftone(t){ var u=String(t||'').toUpperCase(); return u==='COMPLIANCE'?'fail':(u==='TRADEMARK'?'warn':''); }
          root.innerHTML = panel('违禁词（' + rows.length + ' 条）', pagedTable(
            ['词条','类型','站点','语言','禁用原因','添加日期','添加人'],
            rows.map(function(x){ return [
              '<span class="m">' + (x['词条']||'—') + '</span>',
              chip(x['类型']||'—', ftone(x['类型'])),
              x['站点'] || '通用',
              x['语言'] || '全部',
              x['禁用原因'] || '—',
              '<span class="m">' + String(x['添加日期']||'—').slice(0,10) + '</span>',
              x['添加人'] || '—'
            ]; })
          ), {flush:true});
        });
      }
      function openForbiddenModal(){
        var fields = [
          fld('词条', '<input class="ctl" id="f-word" placeholder="要禁用的词，如 bra">'),
          fld('类型', '<select class="ctl" id="f-type"><option>COMPLIANCE</option><option>TRADEMARK</option><option>OTHER</option></select>'),
          fld('站点', '<select class="ctl" id="f-market"><option value="">通用</option><option>US</option><option>GB</option><option>FR</option><option>IT</option><option>ES</option></select>'),
          fld('语言', '<input class="ctl" id="f-lang" placeholder="如 en / 全部">'),
          fld('禁用原因', '<input class="ctl" id="f-reason" placeholder="为什么禁用这个词">')
        ];
        openModal('导入违禁词', fields.join(''), function(close){
          var word = (document.getElementById('f-word')||{}).value || '';
          if (!word){ toast('请填写词条'); return; }
          var payload = {
            word: word, type: (document.getElementById('f-type')||{}).value || 'COMPLIANCE',
            market: (document.getElementById('f-market')||{}).value || '',
            language: (document.getElementById('f-lang')||{}).value || '全部',
            reason: (document.getElementById('f-reason')||{}).value || ''
          };
          API.importForbidden(payload).then(function(r){
            if (r && r.ok && r.data && r.data.success){ toast('违禁词已导入'); close(); loadForbidden(); }
            else { toast((r && r.data && r.data.error) || '导入失败'); }
          });
        }, '导入');
      }
      var fbAdd = document.querySelector('.tb .btn'); if (fbAdd) fbAdd.onclick = openForbiddenModal;
      loadForbidden();
      var fbs = document.querySelectorAll('.tb .sel');
      Array.prototype.forEach.call(fbs, function(s){ s.onchange = loadForbidden; });
    }, 0);
    return el;
  }
});

page('cfg-prompt', {
  roles:['管理员'],
  guide:[
    '「AI 指令」就是告诉 AI 怎么写的那段话。<b>它存在数据库里，不是写死在流程里</b>。',
    '这么做的好处：能对比新旧、能拿历史任务回测、出问题能一键退回、还能回答「这条文案是哪版指令写的」。',
    '<b>新版本必须回测比现在好，才能设为默认</b>。'
  ],
  spec:{
    q:'每个 AI 环节用的是哪一版指令，改了什么，能不能退回。',
    acts:['编辑生成新版本','对比差异','小范围试用','退回','关联回测结果'],
    wf:['所有含 AI 的子流在运行时读取本表'],
    reads:['prompt_version','prompt_template'],
    writes:['prompt_version','audit_log'],
    limits:[
      '<b>指令不写在流程代码里</b>——写死就无法对比、无法退回、无法回答「这条是哪版写的」',
      '通用底层约束<b>所有环节继承</b>，不可在单个环节覆盖',
      '新版本必须回测优于基线才可设为默认'
    ]
  },
    body:function(){ return callout('warn','暂无数据','该功能的数据源尚未建立，接入后显示实际内容。'); }
});

page('cfg-param', {
  roles:['管理员'],
  guide:[
    '这里是各种<b>阈值和权重</b>（比如"亮点至少要有几个新信息点"）。',
    '<b>改之前先跑回测</b>：拿历史任务用新参数重跑一遍，看是不是真的更好。',
    '每版都能退回，正在跑的任务不受影响。'
  ],
  spec:{
    q:'阈值与权重当前是哪一版、依据什么改的、怎么退回。',
    acts:['提交参数变更','跑回测','设为默认','退回'],
    wf:['回测 → WF-28-09'],
    reads:['param_version','param_backtest'],
    writes:['param_version','audit_log'],
    limits:[
      '<b>只在回测显示更优时更新</b>，且必须可退回',
      '没回测过的阈值只用"数量配额"型硬门槛，<b>不用跨类目的固定百分比</b>',
      '在跑的任务用锁定版本，改参数不影响它们'
    ]
  },
    body:function(){ return callout('warn','暂无数据','该功能的数据源尚未建立，接入后显示实际内容。'); }
});

/* ─── 模型配置两页 ─── */

page('cfg-model', {
  roles:['管理员'],
  guide:[
    '在这里添加你要用的 AI 服务商，<b>填一次 API 密钥</b>，之后各个环节都能选它的模型。',
    '密钥<b>存进去就看不到明文了</b>，页面只显示后 4 位。要换就用「轮换密钥」。',
    '加完点「测试连通」确认能用；<b>不能用的服务商不要留着启用</b>。'
  ],
  spec:{
    q:'系统能调哪些 AI 模型、密钥在哪、通不通。',
    acts:['新增服务商','填写/轮换密钥','测试连通','启用/停用','设限流与超时'],
    wf:['无（供全部 AI 环节解析）'],
    reads:['model_provider','model_catalog'],
    writes:['model_provider（密钥加密存储）','audit_log'],
    limits:[
      '密钥<b>加密存储</b>，页面只显示后 4 位，任何接口不返回明文',
      '密钥<b>不得出现在</b>流程代码 / 提示词 / 执行数据 / 文档正文',
      '<b>已定：走网关</b> —— n8n 不直连模型商，密钥永不进入 n8n 执行数据',
      '停用服务商前必须先解除所有环节绑定，否则拒绝停用'
    ]
  },
    body:function(){
    var el = toolbar([], [btn('新增服务商','btn','','','','cfg-model-add')]) + '<div id="cfg-sa-panel">' + ghost('正在加载谷歌服务账号…') + '</div>' + '<div id="cfg-model-root">' + ghost('正在加载服务商…') + '</div>';
    setTimeout(function(){
      (function(){
        var saPanel = document.getElementById('cfg-sa-panel');
        function renderSaPanel(accts){
          if (!saPanel) return;
          var cur = (accts && accts.length) ? accts[0] : null;
          var statusHtml = cur ? ('<div style="font-size:12px;color:var(--g-600);margin-bottom:8px">当前已配置：<b>' + cur.client_email + '</b>（项目 ' + (cur.project_id||'—') + '）</div>') : '<div style="font-size:12px;color:var(--amber-600);margin-bottom:8px">尚未配置谷歌服务账号，图片上传到网盘前必须先配置。</div>';
          saPanel.innerHTML = panel('谷歌服务账号（用于图片上传到谷歌网盘）', statusHtml +
            '<div style="font-size:12px;color:var(--g-500);margin-bottom:6px">粘贴 Google Cloud 服务账号的 JSON 密钥（含 client_email 和 private_key），保存后加密存储，仅用于网盘上传，页面不回显明文。</div>' +
            '<textarea class="ctl" id="sa-json" rows="5" placeholder=\'{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...","client_email":"...@...iam.gserviceaccount.com"}\' style="width:100%;font-family:monospace;font-size:12px"></textarea>' +
            '<div style="margin-top:8px"><button class="btn" id="sa-save-btn">保存服务账号</button></div>');
          var sb = document.getElementById('sa-save-btn');
          if (sb) sb.onclick = function(){
            var raw = (document.getElementById('sa-json')||{}).value || '';
            if (!raw.trim()){ toast('请先粘贴服务账号 JSON'); return; }
            var sa = null;
            try { sa = JSON.parse(raw); } catch(e){ toast('JSON 格式错误，请检查'); return; }
            if (!sa.client_email || !sa.private_key){ toast('JSON 里必须含 client_email 和 private_key'); return; }
            API.saveServiceAccount({ saJson: raw }).then(function(r){
              if (r && r.ok && r.data && r.data.success){ toast('服务账号已保存'); loadSaStatus(); }
              else { toast((r && r.data && r.data.error) || '保存失败'); }
            });
          };
        }
        function loadSaStatus(){
          API.listServiceAccounts().then(function(r){
            renderSaPanel((r && r.data && r.data.accounts) || []);
          });
        }
        loadSaStatus();
      })();
      function openProviderModal(){
        var fields = [
          fld('服务商', '<select class="ctl" id="p-name"><option>云雾 OpenAI（GPT-4o）</option><option>云雾 Gemini</option></select>'),
          fld('API 密钥', '<input class="ctl" id="p-key" type="password" placeholder="填一次，之后只显示后 4 位">'),
          fld('Base URL', '<input class="ctl" id="p-url" value="https://api.openlux.ai/v1">')
        ];
        openModal('新增 AI 服务商', fields.join(''), function(close){
          var key = (document.getElementById('p-key')||{}).value || '';
          if (!key){ toast('请填写 API 密钥'); return; }
          var payload = { provider_name: (document.getElementById('p-name')||{}).value || '云雾 OpenAI', api_key: key, base_url: (document.getElementById('p-url')||{}).value || 'https://api.openlux.ai/v1' };
          API.saveProvider(payload).then(function(r){
            if (r && r.ok && r.data && r.data.success){ toast('服务商已保存（密钥已加密）'); close(); }
            else { toast((r && r.data && r.data.error) || '保存失败'); }
          });
        }, '保存');
      }
      var addBtn = document.querySelector('.tb .btn'); if (addBtn) addBtn.onclick = openProviderModal;
      API.listProviders().then(function(r){
        var root = document.getElementById('cfg-model-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false){ root.innerHTML = callout('warn','暂无服务商','模型服务商数据源尚未接入，请先配置云雾账号密钥。'); return; }
        var rows = ((r.data && r.data.providers)||[]).filter(function(x){ return x && (x.provider_name||x['服务商']||x['name']); });
        if (!rows.length){ root.innerHTML = callout('warn','暂无服务商','还没有配置 AI 服务商，点右上角「新增服务商」添加云雾账号密钥。'); return; }
        root.innerHTML = panel('AI 服务商（' + rows.length + ' 个）', table(['服务商','模型','密钥','状态','限流/超时',''], rows.map(function(x, i){
          var name = x['provider_name']||x['服务商']||x['name']||'—';
          var key = x['密钥后4位']||x['key_tail']||'••••';
          return ['<span class="m">'+name+'</span>', x['模型']||x['model']||'—', '<span class="num">'+key+'</span>', chip(x['启用']===false?'停用':'启用', x['启用']===false?'fail':'ok'), (x['限流']||'—')+' / '+(x['超时']||'—')+'s', '<button class="btn btn--ghost" data-test="'+i+'">测试连通</button> <button class="btn btn--ghost" data-rot="'+i+'">轮换密钥</button>'];
        })), {flush:true, note:'密钥加密存储，页面只显示后 4 位。密钥不得出现在流程代码/提示词/执行数据里。'});
        Array.prototype.forEach.call(root.querySelectorAll('.btn[data-test]'), function(el){ el.onclick = function(){ toast('测试连通暂未接入后端接口'); }; });
        Array.prototype.forEach.call(root.querySelectorAll('.btn[data-rot]'), function(el){ el.onclick = function(){ toast('轮换密钥暂未接入后端接口'); }; });
      });
    }, 0);
    return el;
  }
});page('cfg-binding', {
  roles:['管理员'],
  guide:[
    '系统里有 <b>9 个环节会调用 AI</b>，每个环节可以单独选模型和参数——不是全局一个模型。',
    '「备用模型」是主模型失败时自动顶上的，<b>顶上了会写进检查报告</b>，不会悄悄换。',
    '<b>改绑定会生成新版本</b>，正在跑的任务不受影响，出问题可退回。',
    '注意最后一行的硬性限制：<b>复核环节不能和写作环节用同一家服务商</b>。'
  ],
  spec:{
    q:'每个 AI 环节具体用哪个模型、什么参数、失败了降级给谁。',
    acts:['改绑定','设参数','配降级链','生成新版本','退回'],
    wf:['全部含 AI 的子流在运行时读取本表'],
    reads:['model_profile','model_binding','model_provider'],
    writes:['model_profile（新版本行）','audit_log'],
    limits:[
      '<b>改绑定 = 生成新版本</b>，不就地改；在跑的任务用锁定版本',
      '模型会改变输出，与 AI 指令同级 —— 必须进版本六元组',
      '看图类环节只能绑<b>具备视觉能力</b>的模型，系统据清单校验',
      '<b>硬约束：反向理解复核 与 三个写作环节 不得使用同一服务商</b>，冲突时拒绝保存',
      '降级链被触发时必须写进检查报告，不允许静默换模型'
    ]
  },
    body:function(){ return callout('warn','暂无数据','该功能的数据源尚未建立，接入后显示实际内容。'); }
});

/* ───────── ⑦ 上线跟踪 ───────── */

page('fb-publish', {
  roles:['运营','管理员'],
  guide:[
    '文案上架之后<b>回来填一个 ASIN</b>，系统才能把后续的真实表现和这套文案对上。',
    '不填也不影响使用，但<b>不填就没有效果跟踪</b>，系统也就无法越用越好。',
    '一条商品一个站点填一次即可。'
  ],
  spec:{
    q:'文案上架了吗，登记 ASIN 以便后续跟踪真实表现。',
    acts:['登记 ASIN','标记上线日期','关联入口假设'],
    wf:['无'],
    reads:['listing_final','publication'],
    writes:['publication','audit_log'],
    limits:['没登记 ASIN 的文案<b>不进入效果跟踪</b>，但不影响交付本身']
  },
    body:function(){
    var el = '<div id="fb-publish-root">' + ghost('正在加载已上架待登记…') + '</div>';
    setTimeout(function(){
      API.table('SKU_输入表', {'处理状态':'COMPLETED'}, 200).then(function(r){
        var root = document.getElementById('fb-publish-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['SKU']; });
        if (!rows.length) { root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        root.innerHTML = panel('已上架待登记（' + rows.length + ' 条）', table(
          ['SKU','站点','定稿版本','处理状态','更新时间',''],
          rows.map(function(x){ return [
            '<span class="m">' + (x['SKU']||'—') + '</span>',
            x['目标市场'] || '—',
            '<span class="m">' + (x['定稿版本号']||'—') + '</span>',
            chip(x['处理状态']||'—', 'ok'),
            '<span class="m">' + String(x['更新时间']||'—').slice(0,16).replace('T',' ') + '</span>',
            btn('登记 ASIN','','','','','登记 ASIN 功能暂未开放')
           ]; })
        ), {flush:true});
      });
    }, 0);
    return el;
  }
});

page('fb-perf', {
  roles:['审核','管理员'],
  guide:[
    '每周把真实表现数据导进来，系统按<b>入口类型</b>分开统计。',
    '<b>新品前 14 天的数据不参与判断</b>——冷启动期的数据没有代表性。',
    '标了「探索词」的那些要单独看，别用成熟词的标准去衡量它。'
  ],
  spec:{
    q:'上线后的真实表现如何（按入口类型分）。',
    acts:['上传周表现数据','按入口查看','标记探索词'],
    wf:['WF-28-09（周）'],
    reads:['performance_weekly','publication'],
    writes:['performance_weekly','import_batch'],
    limits:['新品前 14 天不参与假设验证','探索词与成熟词<b>分开评价</b>，不能用同一把尺']
  },
    body:function(){
    var el = '<div id="fb-perf-root">' + ghost('正在加载效果数据…') + '</div>';
    setTimeout(function(){
      API.table('PPC出单词_US', {}, 200).then(function(r){
        var root = document.getElementById('fb-perf-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['客户搜索词']; });
        if (!rows.length) { root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }
        root.innerHTML = panel('出单词效果（' + rows.length + ' 条）', table(
          ['客户搜索词','广告活动','曝光','点击','花费','订单','销售额','ACOS'],
          rows.map(function(x){ return [
            '<span class="m">' + (x['客户搜索词']||'—') + '</span>',
            x['广告活动名称'] || '—',
            '<span class="num">' + (x['曝光']||'0') + '</span>',
            '<span class="num">' + (x['点击']||'0') + '</span>',
            '<span class="num">' + (x['花费']||'0') + '</span>',
            '<span class="num">' + (x['订单']||'0') + '</span>',
            '<span class="num">' + (x['销售额']||'0') + '</span>',
            '<span class="num">' + (x['ACOS']||'—') + '</span>'
           ]; })
        ), {flush:true});
      });
    }, 0);
    return el;
  }
});

page('fb-hypo', {
  roles:['审核','管理员'],
  guide:[
    '生成文案时系统<b>假设</b>了买家主要会从哪里找到这个商品；这一页看<b>实际</b>是不是这样。',
    '假设错了不是坏事——<b>知道错在哪，下次就能改对</b>。',
    '但要分清「假设错了」和「样本还不够」，后者别急着改。'
  ],
  spec:{
    q:'生成时假设的入口，实际成立了吗。',
    acts:['查看验证结论','采纳建议','驳回'],
    wf:['WF-28-09'],
    reads:['hypothesis_validation','publication','performance_weekly'],
    writes:['hypothesis_validation'],
    limits:['结论必须区分「假设错了」与「样本不足」','不得因单周波动就改参数']
  },
    body:function(){ return callout('warn','暂无数据','该功能的数据源尚未建立，接入后显示实际内容。'); }
});

page('fb-backtest', {
  roles:['管理员'],
  guide:[
    '回测 = <b>拿历史任务用新设置重跑一遍</b>，看结果是变好还是变坏。',
    '<b>不要只看总体通过率</b>——下面的例子里有变好的也有变坏的，得你判断哪个代价更大。',
    '确认更好才点「采纳并发布」，会自动生成新版本。'
  ],
  spec:{
    q:'这次改参数/指令/模型，拿历史任务重跑后是变好还是变坏。',
    acts:['选样本','跑回测','对比','采纳并发版','放弃'],
    wf:['WF-28-09'],
    reads:['run','field_candidate','opportunity','param_version','prompt_version','model_profile'],
    writes:['param_backtest','param_version','audit_log'],
    limits:['回测<b>必须能重放历史任务的中间结果</b>——这要求它们落库，不能只存在于执行内存里','只在优于基线时才允许设为默认']
  },
    body:function(){ return callout('warn','暂无数据','该功能的数据源尚未建立，接入后显示实际内容。'); }
});

/* ───────── ⑧ 管理后台 ───────── */

page('adm-user', {
  roles:['管理员'],
  guide:[
    '系统有三种角色：<b>运营</b>（填资料、拿文案）、<b>审核</b>（放行）、<b>管理员</b>（数据、设置、密钥）。',
    '如果客户方的数据岗和你不是同一个人，<b>给他打开「受限管理员」开关</b>——能管数据和规则，但碰不到密钥和用户。',
    '有一件事<b>没有任何角色能做</b>：手动把文案标成"可以上架"。'
  ],
  spec:{
    q:'谁能用这套系统，各自什么角色。',
    acts:['新增用户','改角色','开受限管理员','停用','重置密码'],
    wf:['无'],
    reads:['app_user','role'],
    writes:['app_user','audit_log'],
    limits:[
      '<b>不存在能手动标记"可以上架"的角色</b>——它不属于任何人',
      '角色变更立即生效并记操作记录'
    ]
  },
    body:function(){
    var el = toolbar([], [btn('新增用户','btn','','','','adm-user-add')]) + '<div id="adm-user-root">' + ghost('正在加载用户…') + '</div>';
    setTimeout(function(){
      function openUserModal(u){
        var isEdit = !!u;
        var fields = [
          fld('用户名', '<input class="ctl" id="u-name" ' + (isEdit ? 'value="'+(u.user_name||u['用户名']||'')+'"' : '') + ' placeholder="登录名">'),
          fld('角色', '<select class="ctl" id="u-role"><option>运营</option><option>审核</option><option>管理员</option></select>'),
          (!isEdit ? fld('初始密码', '<input class="ctl" id="u-pwd" type="password" placeholder="至少 8 位">') : '')
        ];
        openModal(isEdit ? '编辑用户' : '新增用户', fields.join(''), function(close){
          var name = (document.getElementById('u-name')||{}).value || '';
          if (!name){ toast('请填写用户名'); return; }
          var role = (document.getElementById('u-role')||{}).value || '运营';
          var pwd = (document.getElementById('u-pwd')||{}).value || '';
          if (!isEdit && !pwd){ toast('请填写初始密码'); return; }
          var payload = isEdit ? { action: 'update', user_name: name, role: role } : { action: 'create', user_name: name, role: role, password: pwd };
          API.manageUser(payload).then(function(r){
            if (r && r.ok && r.data && r.data.success){ toast((isEdit?'编辑':'新增')+'用户成功'); close(); }
            else { toast((r && r.data && r.data.error) || '操作失败'); }
          });
        }, '保存');
      }
      var addBtn = document.querySelector('.tb .btn'); if (addBtn) addBtn.onclick = function(){ openUserModal(null); };
      API.table('用户', {}, 200).then(function(r){
        var root = document.getElementById('adm-user-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false){ root.innerHTML = callout('warn','暂无用户','用户数据源尚未接入（平台用户表），请联系管理员。'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && (x['user_name']||x['用户名']); });
        if (!rows.length){ root.innerHTML = callout('warn','暂无用户','还没有用户账号，点右上角「新增用户」创建。'); return; }
        root.innerHTML = panel('用户（' + rows.length + ' 个）', table(['用户名','角色','状态','最近登录',''], rows.map(function(x, i){
          var name = x['user_name']||x['用户名']||'—';
          var active = !(x['active'] === false);
          return ['<span class="m">'+name+'</span>', x['role']||x['角色']||'—', chip(active?'启用':'停用', active?'ok':'fail'), String(x['last_login_at']||x['最近登录']||'—').slice(0,16).replace('T',' '), '<button class="btn btn--ghost" data-ed="'+i+'">编辑</button> <button class="btn btn--ghost" data-del="'+i+'">删除</button>'];
        })), {flush:true});
        Array.prototype.forEach.call(root.querySelectorAll('.btn[data-ed]'), function(el){ el.onclick = function(){ openUserModal(rows[parseInt(el.getAttribute('data-ed'),10)]); }; });
        Array.prototype.forEach.call(root.querySelectorAll('.btn[data-del]'), function(el){ el.onclick = function(){ var i = parseInt(el.getAttribute('data-del'),10); var u = rows[i]; if (!u) return; if (!confirm('确认停用用户 '+(u.user_name||u['用户名'])+' 吗？')) return; API.manageUser({ action:'delete', user_name: u.user_name||u['用户名'] }).then(function(r){ if (r && r.ok && r.data && r.data.success){ toast('用户已停用'); location.reload(); } else { toast((r&&r.data&&r.data.error)||'操作失败'); } }); }; });
      });
    }, 0);
    return el;
  }
});page('adm-perm', {
  roles:['管理员'],
  guide:[
    '这张表是<b>权限的完整说明</b>，只读。',
    '重点看倒数第一行和第四行：<b>有些事任何人都不能做</b>，只能由系统判定。',
    '这不是"界面把按钮藏起来"——服务器会拒绝，数据库也有约束。'
  ],
  spec:{
    q:'权限矩阵长什么样，哪些能力谁都没有。',
    acts:['查看','（自定义角色为后续能力）'],
    wf:['无'],
    reads:['permission','role'],
    writes:['permission'],
    limits:[
      '<b>界面隐藏按钮 ≠ 权限</b>：每条都必须在服务器拒绝 + 数据库约束两层落实',
      'AI 与系统代码也是权限主体，五类结论只能由代码判定'
    ]
  },
    body:function(){
    var perms = [
      ['填写商品资料','✓','✓','✓','✓'],
      ['生成文案','✓','—','✓','✓'],
      ['复制文案上架','✓','—','✓','✓'],
      ['审核放行','—','✓','✓','✓'],
      ['人工改判选词结论','—','✓','✓','✓'],
      ['导入数据（词库/PPC/竞品）','—','—','✓','✓'],
      ['管理类目/站点/平台规则','—','—','✓','✓'],
      ['管理 AI 模型与密钥','—','—','✓','—'],
      ['管理用户与权限','—','—','✓','—'],
      ['手动标记「可上架」','—','—','—','仅系统判定'],
    ];
    var rows = perms.map(function(p){ return [p[0], p[1], p[2], p[3], p[4]]; });
    return panel('权限矩阵（角色 × 能力）', table(['能力','运营','审核','管理员','受限管理员'], rows), {flush:true, note:'「受限管理员」能管数据和规则，但碰不到密钥和用户。「手动标记可上架」没有任何角色能做——只能由系统五项检查判定。'});
  }
});page('adm-db', {
  roles:['管理员'],
  guide:[
    '关键词表会越攒越大，<b>旧的快照可以归档到冷存储</b>，但被任务用过的不能删。',
    '备份每天自动跑；<b>但"备份成功"不等于"能恢复"——要定期真的演练一次恢复</b>。',
    '「一致性巡检」全是 0 才正常，出现非 0 说明数据库约束漏了，是严重信号。'
  ],
  spec:{
    q:'库大不大、旧数据能不能清、备份有没有在跑、有没有脏数据。',
    acts:['归档旧快照','触发备份','恢复演练','一致性巡检','重建索引'],
    wf:['无（直连数据库运维接口）'],
    reads:['表体积统计','keyword_snapshot','backup_log'],
    writes:['归档标记','backup_log','audit_log'],
    limits:[
      '<b>被任务用过的快照不可删</b>，只能归档到冷存储',
      '恢复演练必须真跑过一次才算数，不能只有备份没有恢复',
      '一致性巡检是<b>兜底</b>，数据库约束才是第一道'
    ]
  },
    body:function(){ return callout('warn','暂无数据','该功能的数据源尚未建立，接入后显示实际内容。'); }
});

page('adm-audit', {
  roles:['管理员'],
  guide:[
    '所有<b>改动</b>都记在这里：改设置、人工改判、轮换密钥、复核规则、导数据、放行。',
    '这张表<b>只增不改不删</b>。',
    '想追某条文案为什么长这样，从这里按对象往回查。'
  ],
  spec:{
    q:'谁在什么时候改了什么。',
    acts:['筛选','导出','按对象追溯'],
    wf:['无'],
    reads:['audit_log'],
    writes:['无'],
    limits:['操作记录<b>只增不改不删</b>','改判、配置变更、密钥轮换、规则复核必须全部留痕']
  },
    body:function(){
    var el = '<div id="adm-audit-root">' + ghost('正在加载操作记录…') + '</div>';
    setTimeout(function(){
      API.table('运行日志表', {}, 200).then(function(r){
        var root = document.getElementById('adm-audit-root');
        if (!root) return;
        if (!r.ok || !r.data || r.data.success === false) { root.innerHTML = callout('stop','数据加载失败',(r.data&&r.data.error)||'请检查网络或稍后重试'); return; }
        var rows = (r.data.data||[]).filter(function(x){ return x && x['运行ID']; });
        if (!rows.length) { root.innerHTML = callout('warn','暂无数据','该功能还没有数据，接入数据源后显示实际内容。'); return; }

        function ftone(s){ var u=String(s||'').toUpperCase(); return u==='SUCCESS'?'ok':(u==='FAILED'?'fail':(u==='REVIEW_REQUIRED'?'warn':'')); }
        root.innerHTML = panel('运行审计（' + rows.length + ' 条）', table(
          ['运行ID','SKU','站点','执行人','最终状态','开始时间',''],
          rows.map(function(x){ return [
            '<span class="m">' + (x['运行ID']||'—') + '</span>',
            '<span class="m">' + (x['SKU']||'—') + '</span>',
            x['目标市场'] || '—',
            x['执行人'] || '—',
            chip(x['最终状态']||'—', ftone(x['最终状态'])),
            '<span class="m">' + String(x['开始时间']||'—').slice(0,16).replace('T',' ') + '</span>',
            btn('详情', '', 'rev-detail', (x['SKU']||''))
           ]; })
        ), {flush:true});
      });
    }, 0);
    return el;
  }
});

page('adm-integration', {
  roles:['管理员'],
  guide:[
    '这里配的是本系统和 <b>n8n 流程引擎</b>、<b>AI 网关</b>、<b>告警渠道</b>的连接。',
    '三个环境要分清：<b>开发</b>先验证 → <b>镜像</b>做对照 → 确认没问题才上<b>客户实例</b>。',
    '<b>没验证过的东西绝对不能上客户实例</b>，这是硬规矩。'
  ],
  spec:{
    q:'这套系统和 n8n、AI 网关、告警是怎么连的。',
    acts:['配置 n8n 实例与 webhook','测试触发','配置 AI 网关','配置告警渠道'],
    wf:['WF-28-00 ~ WF-28-10 全部'],
    reads:['integration_config'],
    writes:['integration_config','audit_log'],
    limits:[
      '<b>一个环境只指向一个 n8n 实例</b>，不允许混地址和密钥',
      '<b>未验证内容禁止上客户实例</b>',
      '长链路 webhook 必须设为"收到即返回"，本系统发完即走，靠轮询数据库拿状态'
    ]
  },
    body:function(){ return callout('warn','暂无数据','该功能的数据源尚未建立，接入后显示实际内容。'); }
});

page('adm-cost', {
  roles:['管理员'],
  guide:[
    '这里的数字来自 <b>AI 网关的逐次记账</b>，是精确值不是估算。',
    '看「离护栏还有多远」——快到上限时系统会<b>暂停队列</b>，而不是偷偷换成便宜模型。',
    '哪个环节最贵一目了然，想省钱先从占比最高的那个环节下手。'
  ],
  spec:{
    q:'花了多少、哪个环节最贵、离护栏还有多远。',
    acts:['查看趋势','按环节/模型下钻','调整护栏阈值'],
    wf:['无'],
    reads:['llm_usage','model_profile','run'],
    writes:['cost_guardrail'],
    limits:[
      '数据来自 <b>AI 网关</b>逐次记账，口径唯一',
      '触到护栏应<b>暂停队列</b>而不是静默降级模型',
      '降级链被触发时必须写进检查报告，成本页与报告两处对得上'
    ]
  },
    body:function(){ return callout('warn','暂无数据','该功能的数据源尚未建立，接入后显示实际内容。'); }
});
