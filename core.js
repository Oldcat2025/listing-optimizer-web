/* ══ 项目28 原型 v0.3 · 内核：导航 / 渲染助手 / 路由 ══
   v0.3 变更：
   - 菜单与页名全面白话化（技术名移到规格抽屉，给开发看）
   - 角色 4 → 3（数据维护并入管理员）
   - 新增 flow() 流程图、guide() 操作指引、ev() 证据字母符号
*/

window.PAGES = {};

/* 角色：运营 / 审核 / 管理员（含数据维护） */
const ROLES = ['运营','审核','管理员'];

/* ═══ API 数据层（连接 n8n webhook） ═══ */
var API = {
  base: 'https://oldcat.zeabur.app/webhook',
  apiKey: 'p28-live-key-2026',
  _post: function(path, body, needKey){
    var headers = {'Content-Type':'application/json'};
    if (needKey) headers['x-api-key'] = this.apiKey;
    return fetch(this.base + path, {method:'POST', headers:headers, body:JSON.stringify(body||{})})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, status:r.status, data:j}; }); })
      .catch(function(e){ return {ok:false, status:0, data:{error:String(e)}}; });
  },
  login: function(u,p){ return this._post('/proj28/api/login', {user_name:u, password:p}, false); },
  skus: function(q){ return this._post('/proj28/api/skus', {query:q||{}}, true); },
  stats: function(){ return this._post('/proj28/api/stats', {}, true); },
  listings: function(){ return this._post('/proj28/api/listings', {}, true); },
  create: function(sku){ return this._post('/proj28/api/skus/create', sku, true); },
  createFamily: function(fam){ return this._post('/proj28/api/families/create', fam, true); },
  auditSku: function(a){ return this._post('/proj28/api/skus/audit', a, true); },
  createCategory: function(c){ return this._post('/proj28/api/categories/create', c, true); },
  createMarket: function(m){ return this._post('/proj28/api/markets/create', m, true); },
  generate: function(sku){ return this._post('/proj28/api/generate', sku, true); },
  table: function(sheet, filter, limit){ return this._post('/proj28/api/table', {sheet:sheet, filter:filter||{}, limit:limit||50}, true); }
};

/* ═══ 登录会话 ═══ */
var ROLE_MAP = {'系统管理员':'管理员', '运营':'运营', '内容管理员':'审核'};
function session(){ try { return JSON.parse(localStorage.getItem('p28_session')||'null'); } catch(e){ return null; } }
function saveSession(s){ localStorage.setItem('p28_session', JSON.stringify(s)); }
function showLogin(err){
  var m = document.getElementById('loginMask');
  if (m){ m.classList.add('on'); var e=document.getElementById('loginErr'); if(e) e.textContent = err||''; }
}
function hideLogin(){ var m=document.getElementById('loginMask'); if(m) m.classList.remove('on'); }
function doLogin(){
  var u = (document.getElementById('loginUser')||{}).value || '';
  var p = (document.getElementById('loginPwd')||{}).value || '';
  if(!u || !p){ showLogin('请输入用户名和密码'); return; }
  var btn = document.getElementById('loginBtn'); if(btn){ btn.disabled=true; btn.textContent='登录中…'; }
  API.login(u,p).then(function(r){
    if(r.ok && r.data && r.data.user_name){
      var role = ROLE_MAP[r.data.role] || '运营';
      saveSession({user_name:r.data.user_name, role:r.data.role, display_role:role});
      ROLE = role;
      var av = document.getElementById('avatar'); if(av) av.textContent = (r.data.user_name||'?').slice(0,1);
      hideLogin();
      render();
    } else {
      if(btn){ btn.disabled=false; btn.textContent='登录'; }
      showLogin('用户名或密码错误');
    }
  });
}
function logout(){
  localStorage.removeItem('p28_session');
  ROLE = '管理员';
  showLogin();
}

/* ─── 导航树 ───
   items = [编号, 白话页名, 页面ID, 技术名（仅规格抽屉可见）] */
const NAV = [
  { g:'①', n:'1', t:'工作台', k:'dash', items:[
    ['1.1','我的待办','dash-todo','角色工作流总览 Role Dashboard'],
    ['1.2','生成进度','dash-runs','批次运行监视 Run Monitor'],
    ['1.3','效果统计','dash-quality','质量看板 Quality Board'],
    ['1.4','全流程与数据积累','dash-flow','Pipeline & Data Accumulation'],
  ]},
  { g:'②', n:'2', t:'我的商品', k:'sku', items:[
    ['2.1','商品列表','sku-list','SKU List'],
    ['2.2','系列与变体','sku-family','产品族 Family Router'],
    ['2.3','商品资料填写','sku-detail','商品事实表 Product Truth'],
    ['2.4','系统识别结果','sku-dna','Product DNA'],
  ]},
  { g:'③', n:'3', t:'生成文案', k:'gen', items:[
    ['3.1','新建生成任务','gen-new','Run 创建'],
    ['3.2','排队情况','gen-queue','Job Queue'],
    ['3.3','生成进度详情','gen-run','Run Detail · 12 步链路'],
    ['3.4','失败重做','gen-retry','定向重试路由 WF-28-08'],
  ]},
  { g:'④', n:'4', t:'文案与审核', k:'rev', items:[
    ['4.1','文案列表','rev-list','定稿列表 Listing Final'],
    ['4.2','文案详情（可复制）','rev-detail','定稿详情'],
    ['4.3','质量检查报告','rev-audit','审计报告 · 五证书'],
    ['4.4','选词记录','rev-ledger','候选台账 Field Candidate Ledger'],
    ['4.5','审核放行','rev-action','审核操作 · override 台账'],
    ['4.6','需人工处理','rev-manual','人工复核队列 Manual Review'],
  ]},
  { g:'⑤', n:'5', t:'数据管理', k:'data', items:[
    ['5.1','关键词数据导入','data-kw','词库快照 Keyword Snapshot'],
    ['5.2','广告与搜索数据','data-ppc','PPC / SQP 摄取与归因'],
    ['5.3','广告组对应商品','data-adgroup','广告组→SKU 映射'],
    ['5.4','竞品入口分析','data-aba','ABA 反查（词表倒排）'],
    ['5.5','关键词机会清单','data-opp','Semantic Opportunity Inventory'],
    ['5.6','关键词效果评级','data-grade','词表证据等级'],
    ['5.7','导入历史','data-import','Import Batch'],
  ]},
  { g:'⑥', n:'6', t:'系统设置', k:'cfg', items:[
    ['6.1','类目规则','cfg-category','Category Config'],
    ['6.2','站点规则','cfg-market','Marketplace Config'],
    ['6.3','平台规则','cfg-rules','Amazon Compliance Rules'],
    ['6.4','违禁词','cfg-forbidden','Forbidden Word Registry'],
    ['6.5','AI 指令版本','cfg-prompt','Prompt Version'],
    ['6.6','参数版本','cfg-param','Param Version'],
    ['6.7','AI 模型与密钥','cfg-model','Model Provider / Key Vault'],
    ['6.8','各环节用哪个模型','cfg-binding','Model Profile Binding'],
  ]},
  { g:'⑦', n:'7', t:'上线跟踪', k:'fb', items:[
    ['7.1','上架登记','fb-publish','Publication Registry'],
    ['7.2','实际表现数据','fb-perf','Performance Weekly'],
    ['7.3','预期对比实际','fb-hypo','Hypothesis Validation'],
    ['7.4','优化建议与回测','fb-backtest','Param Backtest'],
  ]},
  { g:'⑧', n:'8', t:'管理后台', k:'adm', items:[
    ['8.1','用户与权限','adm-user','App User / Role'],
    ['8.2','权限说明','adm-perm','Permission Matrix'],
    ['8.3','数据维护','adm-db','DB Maintenance'],
    ['8.4','操作记录','adm-audit','Audit Log'],
    ['8.5','系统对接','adm-integration','Integration · LLM Gateway'],
    ['8.6','用量与费用','adm-cost','Cost & Quota'],
  ]},
];

/* ═══ 渲染助手 ═══ */

function chip(t, tone){ return '<span class="chip chip--'+(tone||'neutral')+'">'+t+'</span>'; }

function table(cols, rows){
  var h = cols.map(function(c){ return '<th>'+c+'</th>'; }).join('');
  var b = rows.map(function(r){
    return '<tr>'+r.map(function(c){ return '<td>'+c+'</td>'; }).join('')+'</tr>';
  }).join('');
  return '<div class="tw"><table class="t"><thead><tr>'+h+'</tr></thead><tbody>'+b+'</tbody></table></div>';
}

/* 分页表格：超过 pageSize 自动分页，key 用于记住当前页（缺省自动按列名生成） */
var PAGE_STATE = {};
function pagedTable(cols, rows, pageSize, key){
  pageSize = pageSize || 20;
  if (!rows || !rows.length) return table(cols, []);
  var totalPages = Math.ceil(rows.length / pageSize);
  var k = key || cols.join('|');
  var cur = PAGE_STATE[k] || 1;
  if (cur > totalPages) cur = totalPages;
  if (cur < 1) cur = 1;
  PAGE_STATE[k] = cur;
  var t = table(cols, rows.slice((cur-1)*pageSize, (cur-1)*pageSize + pageSize));
  if (totalPages <= 1) return t;
  var pager = '<div style="display:flex;align-items:center;gap:12px;margin-top:12px;justify-content:flex-end;font-size:13px;color:var(--t-3)">' +
    '<button class="btn btn--ghost" data-pg="'+k+'" data-p="'+(cur-1)+'"'+(cur<=1?' disabled':'')+' style="padding:4px 12px">‹ 上一页</button>' +
    '<span>第 '+cur+' / '+totalPages+' 页 · 共 '+rows.length+' 条</span>' +
    '<button class="btn btn--ghost" data-pg="'+k+'" data-p="'+(cur+1)+'"'+(cur>=totalPages?' disabled':'')+' style="padding:4px 12px">下一页 ›</button>' +
    '</div>';
  return t + pager;
}

function panel(title, inner, opt){
  opt = opt || {};
  var sub  = opt.sub  ? '<span class="sub">'+opt.sub+'</span>' : '';
  var note = opt.note ? '<div class="pnl__note">'+opt.note+'</div>' : '';
  var bd   = '<div class="pnl__bd'+(opt.flush?' flush':'')+'">'+inner+'</div>';
  return '<section class="pnl"><div class="pnl__hd'+(opt.strong?' pnl__hd--strong':'')+'"><h3>'+title+'</h3>'+sub+'</div>'+bd+note+'</section>';
}

function toolbar(filters, actions){
  return '<div class="tb"><div class="flt">'+filters.join('')+'</div>'+
         '<div class="btnrow" style="margin:0">'+actions.join('')+'</div></div>';
}
function sel(label, opts){
  return '<select class="sel"><option>'+label+'</option>'+
    (opts||[]).map(function(o){return '<option>'+o+'</option>';}).join('')+'</select>';
}
function inp(ph){ return '<input class="inp" placeholder="'+ph+'">'; }
function btn(t, cls, go, sku, copy, todo){
  var a = (go ? ' data-go="'+go+'"' : '') + (sku ? ' data-sku="'+sku+'"' : '') + (copy ? ' data-copy="'+encodeURIComponent(copy)+'"' : '') + (todo ? ' data-todo="'+todo+'"' : '');
  return '<button class="btn '+(cls||'btn--ghost')+'"'+a+'>'+t+'</button>';
}
function copyText(t){
  function fallback(s){
    var ta = document.createElement('textarea');
    ta.value = s; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch(e){}
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).catch(function(){ fallback(t); });
  } else { fallback(t); }
}
function toast(msg){
  var t = document.getElementById('toast') || (function(){
    var d = document.createElement('div');
    d.id = 'toast';
    d.style.cssText = 'position:fixed;left:50%;bottom:40px;transform:translateX(-50%);background:rgba(20,24,32,.92);color:#fff;padding:10px 18px;border-radius:8px;font-size:14px;z-index:9999;transition:opacity .3s;opacity:0;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.3);';
    document.body.appendChild(d);
    return d;
  })();
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.style.opacity = '0'; }, 2600);
}

function kv(pairs){
  return '<dl class="kv">'+pairs.map(function(p){
    return '<dt>'+p[0]+'</dt><dd>'+p[1]+'</dd>';
  }).join('')+'</dl>';
}

function stats(items, n){
  return '<div class="stats s'+(n||items.length)+'">'+items.map(function(i){
    var tone = (i[3]||'').trim();
    return '<div class="st'+(tone?' st--'+tone:'')+'">'+
      '<div class="st__v'+(i[4]?' sm':'')+'">'+i[1]+'</div>'+
      '<div class="st__tx">'+
        '<div class="st__k">'+i[0]+'</div>'+
        (i[2]?'<div class="st__n">'+i[2]+'</div>':'')+
      '</div></div>';
  }).join('')+'</div>';
}

function steps(list){
  return '<div class="steps">'+list.map(function(s,i){
    return '<div class="step '+s[0]+'">'+
      '<div class="step__i">'+(i+1)+'</div>'+
      '<div class="step__b"><div class="step__t">'+s[1]+'</div>'+
        (s[2]?'<div class="step__m">'+s[2]+'</div>':'')+'</div>'+
      '<div class="step__r">'+(s[3]||'')+'</div></div>';
  }).join('')+'</div>';
}

function bar(pct, tone){
  return '<div class="bar'+(tone?' '+tone:'')+'"><i style="width:'+pct+'%"></i></div>';
}

function callout(kind, title, body){
  return '<div class="callout'+(kind?' '+kind:'')+'"><b>'+title+'</b><p>'+body+'</p></div>';
}

function fld(label, ctl, hint){
  return '<div class="fld"><label>'+label+'</label>'+ctl+
    (hint?'<div class="hint">'+hint+'</div>':'')+'</div>';
}
function txt(v, ro){ return '<input class="ctl" value="'+(v||'')+'"'+(ro?' readonly':'')+'>'; }
function pick(opts){ return '<select class="ctl">'+opts.map(function(o){return '<option>'+o+'</option>';}).join('')+'</select>'; }

function copybox(label, body, meter, actions, mono){
  return '<div class="copybox"><div class="copybox__hd">'+
    '<span class="lb">'+label+'</span>'+
    '<span class="rt"><span class="meter">'+meter+'</span>'+(actions||'')+'</span></div>'+
    '<div class="copybox__bd'+(mono?' mono':'')+'">'+body+'</div></div>';
}

function tabs(list){
  return '<div class="tabs2">'+list.map(function(t,i){
    return '<div class="tab2'+(i===0?' on':'')+'">'+t+'</div>';
  }).join('')+'</div>';
}

function ghost(t){ return '<div class="ghost">'+t+'</div>'; }

/* ─── 通用弹窗 ─── */
function openModal(title, html, onOK, okLabel){
  var mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML = '<div class="modal"><div class="modal__hd"><h3>'+title+'</h3><button class="modal__x" type="button">×</button></div><div class="modal__bd">'+html+'</div><div class="modal__ft"><button class="btn btn--ghost modal__cancel" type="button">取消</button><button class="btn modal__ok" type="button">'+(okLabel||'确定')+'</button></div></div>';
  document.body.appendChild(mask);
  var close = function(){ if (mask.parentNode) document.body.removeChild(mask); };
  mask.querySelector('.modal__x').onclick = close;
  mask.querySelector('.modal__cancel').onclick = close;
  mask.onclick = function(e){ if (e.target === mask) close(); };
  mask.querySelector('.modal__ok').onclick = function(){ if (onOK) onOK(close); };
  return mask;
}

/* ─── 证据字母符号：F 事实 / A 市场 / S 账户 / R 反查 ─── */
var EV_MAP = {
  F:['ev--f','商品事实表'],
  A:['ev--a','卖家精灵市场数据'],
  S:['ev--s','账户 SQP 数据'],
  R:['ev--r','竞品反查']
};
function ev(letters){
  return '<span class="ev">'+String(letters).split('').filter(function(c){return EV_MAP[c];})
    .map(function(c){ return '<i class="'+EV_MAP[c][0]+'" title="'+EV_MAP[c][1]+'">'+c+'</i>'; })
    .join('')+'</span>';
}
function evLegend(){
  return '<div class="evleg">'+Object.keys(EV_MAP).map(function(c){
    return '<span><i class="'+EV_MAP[c][0]+'">'+c+'</i>'+EV_MAP[c][1]+'</span>';
  }).join('')+'</div>';
}

/* ─── 横向流程图 ───
   nodes = [{t:标题, s:副标题, n:待办数, tone:'fail|warn|ok|', go:'页面ID'}] */
function flow(nodes){
  return '<div class="flow">'+nodes.map(function(nd,i){
    var badge = (nd.n === undefined) ? '' :
      '<span class="fnode__b'+(nd.n>0?(' on'+(nd.tone?' '+nd.tone:'')):'')+'">'+nd.n+'</span>';
    var arrow = (i < nodes.length-1) ? '<div class="farrow">→</div>' : '';
    var go = nd.go ? ' onclick="location.hash=\''+nd.go+'\'"' : '';
    return '<div class="fnode'+(nd.go?' link':'')+'"'+go+'>'+
      '<div class="fnode__no">'+('0'+(i+1)).slice(-2)+'</div>'+
      '<div class="fnode__t">'+nd.t+'</div>'+
      '<div class="fnode__s">'+(nd.s||'')+'</div>'+
      badge+'</div>'+arrow;
  }).join('')+'</div>';
}

/* ─── 分段流程（大段包步骤）───
   phases = [{no, t, s, state:'done|now|wait|fail', time, steps:[[state,标题,说明,耗时]]}] */
function phaseFlow(phases){
  return '<div class="pf">'+phases.map(function(p){
    var body = p.steps.map(function(s,i){
      return '<div class="pstep '+s[0]+'">'+
        '<span class="pstep__i">'+(i+1)+'</span>'+
        '<span class="pstep__t">'+s[1]+'</span>'+
        '<span class="pstep__m">'+(s[2]||'')+'</span>'+
        '<span class="pstep__r">'+(s[3]||'')+'</span></div>';
    }).join('');
    return '<section class="phase '+p.state+'">'+
      '<div class="phase__hd">'+
        '<div class="phase__no">'+p.no+'</div>'+
        '<div class="phase__tx"><b>'+p.t+'</b><i>'+p.s+'</i></div>'+
        '<div class="phase__rt">'+(p.chip||'')+'<span class="phase__time">'+(p.time||'')+'</span></div>'+
      '</div><div class="phase__bd">'+body+'</div></section>';
  }).join('')+'</div>';
}

/* ─── 操作指引 ─── */
function guideBar(list){
  if (!list || !list.length) return '';
  return '<details class="guide" open><summary><b>怎么操作</b>'+
    '<span class="guide__n">'+list.length+' 步</span></summary><ol class="guide__ol">'+
    list.map(function(g){ return '<li>'+g+'</li>'; }).join('')+
    '</ol></details>';
}

function page(id, def){ window.PAGES[id] = def; }

/* ═══ 路由与外壳 ═══ */
var CUR  = 'dash-todo';
var ROLE = '管理员';

function findNav(id){
  for (var i=0;i<NAV.length;i++){
    var g = NAV[i];
    for (var j=0;j<g.items.length;j++){
      if (g.items[j][2] === id) return { g:g, it:g.items[j] };
    }
  }
  return null;
}

function allowed(def){
  if (!def || !def.roles) return true;
  return def.roles.indexOf(ROLE) >= 0 || def.roles.indexOf('*') >= 0;
}
function groupVisibleCount(g){
  return g.items.filter(function(it){ return allowed(window.PAGES[it[2]]); }).length;
}
function firstAllowedOf(g){
  for (var i=0;i<g.items.length;i++){
    if (allowed(window.PAGES[g.items[i][2]])) return g.items[i][2];
  }
  return g.items[0][2];
}

function renderTabs(cur){
  document.getElementById('groupTabs').innerHTML = NAV.map(function(g){
    var on  = (g === cur.g) ? ' on' : '';
    var vis = groupVisibleCount(g);
    var dot = (vis === 0) ? '<span class="dot">无权限</span>' : '';
    return '<div class="tab'+on+'" data-g="'+g.k+'">'+g.t+dot+'</div>';
  }).join('');
  Array.prototype.forEach.call(document.querySelectorAll('.tab[data-g]'), function(el){
    el.onclick = function(){
      var k = el.getAttribute('data-g');
      for (var i=0;i<NAV.length;i++){
        if (NAV[i].k === k){ location.hash = firstAllowedOf(NAV[i]); return; }
      }
    };
  });
}

function renderSide(cur){
  var g = cur.g;
  document.getElementById('sideIco').textContent   = g.n;
  document.getElementById('sideTitle').textContent = g.t;
  document.getElementById('sideSub').textContent   =
    g.items.length + ' 个页面 · ' + ROLE + '可见 ' + groupVisibleCount(g);

  document.getElementById('sideNav').innerHTML = g.items.map(function(it, i){
    var def  = window.PAGES[it[2]] || {};
    var lock = allowed(def) ? '' : ' lock';
    var on   = (it[2] === CUR) ? ' on' : '';
    return '<div class="sitem'+on+lock+'" data-id="'+it[2]+'">'+
      '<span class="sitem__no">'+('0'+(i+1)).slice(-2)+'</span>'+
      '<span class="sitem__tx">'+it[1]+'</span>'+
      '<span class="sitem__ch">'+(lock?'🔒':'›')+'</span></div>';
  }).join('');

  Array.prototype.forEach.call(document.querySelectorAll('.sitem'), function(el){
    el.onclick = function(){
      if (el.classList.contains('lock')) return;
      location.hash = el.getAttribute('data-id');
    };
  });
}

function renderSpec(def, nv){
  var s = def.spec || {};
  var sec = function(t, inner){ return '<div class="sec"><h4>'+t+'</h4>'+inner+'</div>'; };
  var ul = function(arr, cls){
    if (!arr || !arr.length) return '<p style="color:var(--t-4)">—</p>';
    return '<ul>'+arr.map(function(x){ return '<li class="'+(cls||'')+'">'+x+'</li>'; }).join('')+'</ul>';
  };
  document.getElementById('specBody').innerHTML =
    sec('技术名（开发用）', '<p class="tech">'+(nv.it[3]||'—')+'</p>') +
    sec('这一页回答什么', '<p>'+(s.q||'—')+'</p>') +
    sec('可用角色', ul(def.roles||['*'])) +
    sec('关键动作', ul(s.acts)) +
    sec('调用工作流', ul(s.wf, 'r')) +
    sec('读表', ul(s.reads, 'db')) +
    sec('写表', ul(s.writes, 'db')) +
    sec('边界 / 硬约束', ul(s.limits, 'w'));
}

function render(){
  var id = location.hash.replace('#','') || 'dash-todo';
  if (!window.PAGES[id]) id = 'dash-todo';
  CUR = id;
  var def = window.PAGES[id];
  var nv  = findNav(id);

  renderTabs(nv);
  renderSide(nv);

  var roles = (def.roles||['*']).map(function(r){
    return chip(r, r===ROLE ? 'ok' : 'neutral');
  }).join('');

  var head =
    '<div class="ph">' +
      '<div class="ph__crumb">'+nv.g.t+' <span>·</span> '+nv.it[0]+'</div>' +
      '<div class="ph__row"><div>' +
        '<div class="ph__t">'+nv.it[1]+'</div>' +
        '<div class="ph__q">'+((def.spec&&def.spec.q)||'')+'</div>' +
        '<div class="ph__roles">'+roles+'</div>' +
      '</div></div>' +
    '</div>';

  var body = allowed(def)
    ? guideBar(def.guide) + def.body()
    : callout('stop', '你当前的角色（'+ROLE+'）看不到这一页',
        '本页只对 '+(def.roles||[]).join(' / ')+' 开放。这不只是把按钮藏起来——服务器会拒绝请求，数据库也有约束兜底。想对比不同角色看到什么，换右上角的角色。');

  document.getElementById('page').innerHTML = head + body;
  renderSpec(def, nv);
  window.scrollTo(0, 0);
}

function BOOT(){
  var sp = document.getElementById('spec');
  var mk = document.getElementById('mask');

  /* 登录检查：有会话则恢复角色，否则显示登录遮罩 */
  var s = session();
  if (s && s.display_role) {
    ROLE = s.display_role;
    var av0 = document.getElementById('avatar'); if(av0) av0.textContent = (s.user_name||'?').slice(0,1);
  } else {
    showLogin();
  }
  var lb = document.getElementById('loginBtn'); if(lb) lb.onclick = doLogin;
  var lx = document.getElementById('logoutBtn'); if(lx) lx.onclick = logout;
  var lp = document.getElementById('loginPwd'); if(lp) lp.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });

  var open = function(v){ sp.classList.toggle('open', v); mk.classList.toggle('on', v); };
  document.getElementById('specBtn').onclick = function(){ open(!sp.classList.contains('open')); };
  document.getElementById('specX').onclick   = function(){ open(false); };
  mk.onclick = function(){ open(false); };

  var rs = document.getElementById('roleSel');
  rs.innerHTML = ROLES.map(function(r){ return '<option>'+r+'</option>'; }).join('');
  rs.value = ROLE;
  rs.onchange = function(e){
    ROLE = e.target.value;
    document.getElementById('avatar').textContent = ROLE.slice(0,1);
    render();
  };

  /* 详情/跳转按钮：带 data-go 的按钮点击后跳转，data-sku 存入 CUR_SKU 供详情页读取 */
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest ? e.target.closest('.btn') : null;
    if (!b) return;
    var pg = b.getAttribute('data-pg');
    if (pg && !b.disabled){
      PAGE_STATE[pg] = parseInt(b.getAttribute('data-p'), 10);
      render();
      return;
    }
    var sku = b.getAttribute('data-sku');
    if (sku) window.CUR_SKU = sku;
    var go = b.getAttribute('data-go');
    if (go) location.hash = go;
    var copy = b.getAttribute('data-copy');
    if (copy) copyText(decodeURIComponent(copy));
    var todo = b.getAttribute('data-todo');
    if (todo) toast(todo);
  });

  window.onhashchange = render;
  render();
}
