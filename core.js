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
  // [二期需求1] 商品模板：save / list / delete（WH-Template）
  template: function(t){ return this._post('/proj28/api/templates', t, true); },
  auditSku: function(a){ return this._post('/proj28/api/skus/audit', a, true); },
  createCategory: function(c){ return this._post('/proj28/api/categories/create', c, true); },
  createMarket: function(m){ return this._post('/proj28/api/markets/create', m, true); },
  manageUser: function(u){ return this._post('/proj28/api/users/manage', u, true); },
  saveProvider: function(p){ return this._post('/proj28/api/providers/save', p, true); },
  listProviders: function(){ return this._post('/proj28/api/providers/list', {}, true); },
  importForbidden: function(f){ return this._post('/proj28/api/forbidden/import', f, true); },
  queueManage: function(q){ return this._post('/proj28/api/queue/manage', q, true); },
  permSave: function(rows){ return this._post('/proj28/api/perms/save', {rows: rows}, true); },
  uploadImage: function(img){ return this._post('/proj28/api/images/upload', img, true); },
  saveServiceAccount: function(sa){ return this._post('/proj28/api/google/sa', sa, true); },
  listServiceAccounts: function(){ return this._post('/proj28/api/google/sa-list', {}, true); },
  generate: function(sku){ return this._post('/proj28/api/generate', sku, true); },
  seasonsManage: function(o){ return this._post('/proj28/api/seasons/manage', o, true); },
  /* [fix 09-17b] 系统参数保存（6.x 系统参数页的开关用它） */
  saveConfig: function(c){ return this._post('/proj28/api/config/save', c, true); },
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
    ['2.2','父体','sku-family','父体 Parent'],
    ['2.3','商品资料填写','sku-detail','商品事实表 Product Truth'],
    ['2.4','系统识别结果','sku-dna','Product DNA'],
  ]},
  { g:'③', n:'3', t:'生成文案', k:'gen', items:[
    ['3.1','新建生成任务','gen-new','Run 创建'],
    ['3.2','排队情况','gen-queue','Job Queue'],
    ['3.3','生成进度详情','gen-run','Run Detail · 12 步链路'],
    ['3.4','人工审核重做','gen-retry','人工审核 + 定向重试'],
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
    ['6.5','季节范围','cfg-season','Season Scope Config'],
    ['6.6','AI 指令版本','cfg-prompt','Prompt Version'],
    ['6.7','参数版本','cfg-param','Param Version'],
    ['6.8','AI 模型与密钥','cfg-model','Model Provider / Key Vault'],
    ['6.9','各环节用哪个模型','cfg-binding','Model Profile Binding'],
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
function thumbHtml(url, size){ size = size || 40; if (!url) return '<span style="color:var(--t-3)">—</span>'; var u = String(url); if (u.indexOf('aliyuncs.com') >= 0 && u.indexOf('x-oss-process') < 0){ u += (u.indexOf('?') >= 0 ? '&' : '?') + 'x-oss-process=image/resize,w_' + Math.max(size * 5, 200); } if (u.indexOf('http') === 0) return '<img src="'+u+'" style="width:'+size+'px;height:'+size+'px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;display:block" loading="lazy">'; return '<span style="font-size:11px;color:var(--t-3)">本地图</span>'; }

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

function toolbar(filters, actions, opt){
  opt = opt || {};
  // [4.2/4.3 改造] opt.tight = 筛选与按钮**紧挨**（默认仍两端对齐，向后兼容）
  // ⚠️ 必须用 **inline style**：静态站无 Cache-Control → 浏览器启发式缓存旧 app.css，
  //    只靠 .tb--tight 类会「代码已改、用户看到的还是旧的」。inline 样式优先级更高，缓存无忧。
  var st = opt.tight ? ' style="justify-content:flex-start"' : '';
  return '<div class="tb'+(opt.tight?' tb--tight':'')+'"'+st+'><div class="flt">'+filters.join('')+'</div>'+
         '<div class="btnrow" style="margin:0">'+actions.join('')+'</div></div>';
}

/* [4.2/4.3 改造] 站点全集（原先两页硬编码 5 站，漏了 DE 与 CA） */
var MARKETS_ALL = ['US','GB','DE','FR','IT','ES','CA'];

/* [4.2/4.3 共用] 「最近 10 条成功文案」
   成功 = 证书「全部通过」= TRUE（fail-closed：未通过的写进定稿也不算成功文案）
   用法：recentTenPanel().then(function(h){ 容器.innerHTML = h; wireRecent(fn); })      */
function recentTenPanel(opt){
  opt = opt || {};
  // 证书表载荷大（每行含 5 份证书 JSON），只取最近 80 行足够覆盖「最近 10 条」的筛选 → 降低耗时
  return Promise.all([API.table('定稿输出表', {}, 200), API.table('证书表', {}, 80)]).then(function(rs){
    var fin  = ((rs[0].data||{}).data) || [];
    var cert = ((rs[1].data||{}).data) || [];
    var pass = {};
    cert.forEach(function(c){ if (String(c['全部通过']||'').toUpperCase()==='TRUE') pass[String(c['SKU']||'')] = 1; });
    var rows = fin.filter(function(x){
      if (!x || !x['Title']) return false;
      return opt.onlyPassed === false ? true : !!pass[String(x['SKU']||'')];
    });
    rows.sort(function(a,b){ var ta=String(a['生成时间']||''), tb=String(b['生成时间']||''); return ta<tb?1:(ta>tb?-1:0); });
    var top = rows.slice(0, 10);
    var sub = '点「查看」直接把这一条载入下面的结果区';
    if (!top.length) return panel('最近 10 条成功文案', callout('warn','暂时还没有成功的文案','五证书全部通过后会自动出现在这里。'), {sub:sub});
    var trs = top.map(function(x){
      var sku = String(x['SKU']||''), tt = String(x['Title']||'');
      return [ '<span class="m">'+sku+'</span>',
               x['目标市场']||'—',
               '<span style="font-size:12px;color:var(--t-3)">'+bjTime(x['生成时间'])+'</span>',
               '<span style="font-size:12px">'+(tt.length>44?tt.slice(0,44)+'…':tt)+'</span>',
               '<button class="btn btn--ghost" data-recent-sku="'+sku+'">查看</button>' ];
    });
    return panel('最近 10 条成功文案（共 '+rows.length+' 条成功，按生成时间倒序）',
                 table(['SKU','站点','生成时间','标题',''], trs), {flush:true, sub:sub});
  });
}
/* 绑定「查看」：回填查询框 → 调 onPick（页面自己的重载函数）
   ⚠️ 必须给**明确反馈**：详情区在列表下方，若点的是当前那条、内容不变，用户会以为"点击没反应"（实测被反馈过）。
   三重反馈：① 按钮文字变「已载入」+ 高亮该行（inline 样式，不受 app.css 缓存影响）② toast 提示 ③ 平滑滚到结果区 */
function wireRecent(onPick){
  Array.prototype.forEach.call(document.querySelectorAll('[data-recent-sku]'), function(b){
    b.onclick = function(){
      var sku = b.getAttribute('data-recent-sku');
      var qi = document.querySelector('.tb .inp'); if (qi) qi.value = sku;
      var si = document.querySelector('.tb .sel'); if (si) si.selectedIndex = 0;
      // ① 高亮当前行
      Array.prototype.forEach.call(document.querySelectorAll('[data-recent-sku]'), function(x){
        x.style.background = ''; x.style.borderColor = ''; x.style.color = ''; x.textContent = '查看';
      });
      b.style.background = 'var(--g-600)'; b.style.borderColor = 'var(--g-600)'; b.style.color = '#fff';
      b.textContent = '已载入';
      // ② 文字反馈
      if (typeof toast === 'function') toast('已载入 ' + sku + ' —— 内容已切到下方结果区');
      onPick(sku);
      // ③ 滚到结果区
      setTimeout(function(){
        var r = document.querySelector('#rev-detail-root .copybox') || document.querySelector('#rev-audit-root .stats') ||
                document.getElementById('rev-detail-root') || document.getElementById('rev-audit-root');
        if (r && r.scrollIntoView) { try { r.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e){ r.scrollIntoView(); } }
      }, 450);
    };
  });
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
function bjTime(t){
  if (!t) return '—';
  var d = new Date(t);
  if (isNaN(d.getTime())) return String(t).slice(0,16).replace('T',' ');
  var bj = new Date(d.getTime() + 8*3600*1000);
  var p = function(n){ return (n<10?'0':'')+n; };
  return bj.getUTCFullYear()+'-'+p(bj.getUTCMonth()+1)+'-'+p(bj.getUTCDate())+' '+p(bj.getUTCHours())+':'+p(bj.getUTCMinutes());
}
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
      '<div class="st__v'+(i[4]?' sm':'')+'" style="white-space:normal;word-break:break-word;overflow-wrap:anywhere;line-height:1.25">'+i[1]+'</div>'+
      '<div class="st__tx">'+
        '<div class="st__k" style="white-space:normal;word-break:break-word;overflow-wrap:anywhere;line-height:1.2">'+i[0]+'</div>'+
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

/* ─── 尺寸多选共用工具（2.2 父体弹窗 / 2.3 商品资料 共用）─── */
var SKU_SIZE_OPTIONS = ['16x16 inch','18x18 inch','20x20 inch','24x24 inch','26x26 inch'];
/* [fix 09-16v] 尺寸选项**按站点单位自适应** —— 原先写死 inch 列表，德国站（cm）也显示 inch，
   这也是「商品模板尺寸对不上」的根源。美国/加拿大/英国用 inch，德/法/意/西用 cm。 */
var SIZE_BY_UNIT = {
  inch: ['16x16 inch','18x18 inch','20x20 inch','24x24 inch','26x26 inch'],
  cm:   ['40x40 cm','45x45 cm','50x50 cm','55x55 cm','60x60 cm']
};
function sizeOptionsForMarket(mkt){
  var m = String(mkt || 'US').toUpperCase();
  return (m === 'US' || m === 'CA' || m === 'GB') ? SIZE_BY_UNIT.inch : SIZE_BY_UNIT.cm;
}
function sizeCheckboxesHtml(mkt){
  return sizeOptionsForMarket(mkt).map(function(s){ return '<label style="display:inline-flex;align-items:center;gap:4px;font-size:13px;margin-right:14px;white-space:nowrap"><input type="checkbox" value="'+s+'"> '+s+'</label>'; }).join('');
}
    /* [fix 09-16aq] 处理状态中文说明 + 悬停解释（客户反馈：只看到 PENDING 不知道什么意思、也不知道下一步点哪） */
    /* [fix 09-16ar] 产品识别（ProductDNA）状态：新增商品成功后系统会自动识别（同父体同站点只识别1次）
   开关见 6.x 系统参数 recognize_on_create；这里只负责显示，已识别的才算完成 */
function recogCn(v){
  var s = String(v||'').trim();
  if (s === '已识别') return '已识别';
  if (s === '识别中') return '识别中';
  if (s === '识别失败') return '识别失败';
  return '待识别';
}
function recogTip(v){
  var s = String(v||'').trim();
  if (s === '已识别') return '已完成产品识别（9 维档案），生成文案时直接复用。';
  if (s === '识别失败') return '产品识别失败。重新提交生成时会重试。';
  if (s === '识别中') return '正在做产品识别（9 维档案）。\n识别是生成流程的第 ② 步 —— 识别结果落库后，系统才会用它去写标题/亮点/五点/后台词（第 ⑥ 步）。\n所以「生成中 + 识别中」是正常的过程状态，不是漏做了识别。';
  return '还没提交生成，所以还没做产品识别（9 维档案）。\n提交生成后，第 ② 步就是产品识别，识别结果落库后才写文案。\n同一父体、同一站点的多个尺寸只识别 1 次（其余复用）。';
}
function recogTone(v){
  var s = String(v||'').trim();
  if (s === '已识别') return 'ok';
  if (s === '识别失败') return 'fail';
  if (s === '识别中') return 'run';
  return 'neutral';
}
function statusCn(st){
      var s = String(st||'').toUpperCase();
      if (s === 'COMPLETED') return '已完成';
      if (s === 'PROCESSING') return '生成中';
      if (s === 'REVIEW_REQUIRED') return '待人工审核';
      if (s === 'FAILED') return '失败';
      if (s === '' || s === 'PENDING' || s === '待处理') return '待生成';
      return String(st||'—');
    }
    function statusTip(st){
      var s = String(st||'').toUpperCase();
      if (s === '' || s === 'PENDING' || s === '待处理') return '已录入，还没开始处理。\n点右边的「去生成 →」提交生成：系统会先做产品识别（9 维档案），再写标题/亮点/五点/后台词。\n同一父体、同一站点的多个尺寸只识别 1 次（其余自动复用）。';
      if (s === 'PROCESSING') return '正在生成：产品识别 → 写作 → 五证书 → 定稿落库。一般 12 分钟内完成。';
      if (s === 'COMPLETED') return '已生成完毕，五证书全部通过。可在「4.2 文案与审核」看成品。';
      if (s === 'REVIEW_REQUIRED') return '需要人工处理：去「3.4 人工审核重做」查看失败原因并重新提交。';
      if (s === 'FAILED') return '生成失败：去「3.4 人工审核重做」查看原因并重新提交。';
      return '';
    }
    function refreshSizeChoices(mkt){
  /* [fix 09-16ap] 若已选了父体 → 尺寸仍以**父体的计划**为准。
     否则用户改「目标市场」时会把父体收敛的结果覆盖掉（父体在上面、市场在下面，很容易误操作）。 */
  var sel = document.getElementById('nsku-family');
  if (sel && String(sel.value || '') && (window.FAM_CACHE || []).some(function(x){ return String(x['family_id'] || x['产品族ID'] || '') === String(sel.value); })){
    onSkuFamilyChange();
    return;
  }
  renderSizeChoices('nsku-dims', mkt);
}

/* [fix 09-16ao] 通用版：可指定容器 + 自定义尺寸清单 + 尾部附加项
   （原来只能刷 nsku-dims 且清单写死按站点出，父体弹窗没法用） */
function renderSizeChoices(boxId, mkt, opts){
  opts = opts || {};
  var box = document.getElementById(boxId);
  if (!box) return;
  var keep = opts.keep || checkedVals(boxId);
  var list = opts.list || sizeOptionsForMarket(mkt);
  var style = 'display:inline-flex;align-items:center;gap:4px;font-size:13px;margin-right:14px;white-space:nowrap';
  box.innerHTML = list.map(function(s){
    return '<label style="' + style + '"><input type="checkbox" value="' + s + '"> ' + s + '</label>';
  }).join('') + (opts.tail || '');
  Array.prototype.forEach.call(box.querySelectorAll('input[type=checkbox]'), function(x){ if (keep.indexOf(x.value) >= 0) x.checked = true; });
}

/* 新增父体弹窗：尺寸选项按「站点」的单位出（原先写死 US/inch —— 这就是"父体写 inch、商品却是 cm"的根因） */
function refreshFamSizeChoices(mkt){
  renderSizeChoices('nfam-sizes', mkt);
}

/* 2.3 商品表单：选了父体 → 尺寸收敛为该父体声明的计划尺寸（可勾「其它尺寸」展开本站点全部） */
function onSkuFamilyChange(){
  var sel = document.getElementById('nsku-family');
  var box = document.getElementById('nsku-dims');
  if (!sel || !box) return;
  var fid = String(sel.value || '');
  var mkt = (document.getElementById('nsku-market') || {}).value || 'US';
  var note = document.getElementById('nsku-size-note');
  var fam = (window.FAM_CACHE || []).filter(function(x){ return String(x['family_id'] || x['产品族ID'] || '') === fid; })[0];
  /* [fix 09-16ap] 父体记着自己的站点 → 选中后自动把「目标市场」带过去（单位才不会错）。
     marketplace='ALL'（多站点父体）时不动，尊重用户自己选的市场。 */
  if (fam){
    var pm = String(fam['站点'] || fam.marketplace || '').toUpperCase();
    if (/^[A-Z]{2}$/.test(pm)){
      var ms = document.getElementById('nsku-market');
      if (ms && ms.value !== pm){ ms.value = pm; }
      mkt = pm;
    }
  }
  if (fid && fam && Array.isArray(fam.sizes) && fam.sizes.length){
    renderSizeChoices('nsku-dims', mkt, { list: fam.sizes, keep: [], tail:
      '<label style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:#8A9390;cursor:pointer"><input type="checkbox" id="nsku-more-sizes"> 其它尺寸</label>' });
    if (note) note.innerHTML = '已按父体 <b>' + fid + '</b> 的计划尺寸显示（' + fam.sizes.join(' / ') + '）。要计划外的尺寸，勾「<b>其它尺寸</b>」。';
    var more = document.getElementById('nsku-more-sizes');
    if (more) more.onchange = function(){
      if (more.checked){
        renderSizeChoices('nsku-dims', mkt, { keep: checkedVals('nsku-dims') });
        if (note) note.innerHTML = '已展开本站点全部尺寸。<b style="color:#C0392B">选父体计划外的尺寸，父体清单会提示「计划外尺寸」</b>。';
      } else { onSkuFamilyChange(); }
    };
  } else {
    renderSizeChoices('nsku-dims', mkt);
    if (note) note.innerHTML = '按目标市场单位显示（US/CA/GB 用 inch，德法意西用 cm）。归入父体后会自动收敛为该父体的计划尺寸。';
  }
}
function checkedVals(boxId){ var box=document.getElementById(boxId); if(!box) return []; return Array.prototype.slice.call(box.querySelectorAll('input[type=checkbox]:checked')).map(function(x){ return x.value; }); }
function sizeTag(s){ return String(s||'').replace(/\s*inch\s*/i,'').replace(/[^0-9a-zA-ZxX]/g,'').toUpperCase(); }
function resetCheckboxes(boxId){ var box=document.getElementById(boxId); if(!box) return; Array.prototype.forEach.call(box.querySelectorAll('input[type=checkbox]'), function(x){ x.checked=false; }); }

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

  /* [fix 09-16aj] 防止误触丢内容 —— 客户反馈：点窗体以外的区域，整个窗体和已填内容全没了，做到一半要重来。
     策略：① 点窗体以外**不再直接关闭**（填过东西就保留并提示；没填过才关）
           ② 点 × 或「取消」时，若填过东西 → 先确认
           ③ ESC 同上；关闭时移除键盘监听，避免残留 */
  var _fields = mask.querySelectorAll('input, select, textarea');
  function _sig(f){ return (f.type === 'checkbox' || f.type === 'radio') ? (f.checked ? '1' : '0') : String(f.value || ''); }
  var _init = [];
  Array.prototype.forEach.call(_fields, function(f, i){ _init[i] = _sig(f); });
  function _dirty(){
    var d = false;
    Array.prototype.forEach.call(_fields, function(f, i){ if (_sig(f) !== _init[i]) d = true; });
    return d;
  }
  function _destroy(){
    document.removeEventListener('keydown', _onKey);
    if (mask.parentNode) document.body.removeChild(mask);
  }
  function close(){ _destroy(); }                                  // 提交成功用：直接销毁
  function _askClose(){
    if (_dirty() && !confirm('这个窗口里已经填了内容。确定关闭并丢弃吗？')) return;
    _destroy();
  }
  function _onKey(ev){
    if (!mask.parentNode) { document.removeEventListener('keydown', _onKey); return; }  // 弹窗已被其它途径移除 → 自卸载
    if (ev.key === 'Escape') _askClose();
  }
  mask.querySelector('.modal__x').onclick = _askClose;
  mask.querySelector('.modal__cancel').onclick = _askClose;
  mask.onclick = function(e){
    if (e.target !== mask) return;
    if (_dirty()) { if (typeof toast === 'function') toast('内容已保留，不会丢 —— 关闭请点「取消」或右上角 ×'); return; }
    _destroy();
  };
  document.addEventListener('keydown', _onKey);
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
      var g = el.getAttribute('data-id');
      // [fix 09-02] 从菜单进「商品资料填写」= 新增意图，清残留 CUR_SKU，避免误进编辑(新增产品模块消失)
      if (g === 'sku-detail') window.CUR_SKU = undefined;
      location.hash = g;
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
  // [fix 09-02] 支持带参 hash：'sku-dna/P28' 或 'sku-dna?sku=P28' → 页面 id 取 '/' 与 '?' 之前的部分
  var _h = (location.hash || '').replace('#', '');
  var id = String(_h).split('/')[0].split('?')[0] || 'dash-todo';
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

/* [fix 09-16p] ④ 主线A 前端两个动作（PRD §4.4）
   ① 生成父体：该父体下所有商品逐个提交；首个变体生成共享内容（9维档案/五点/Backend），
      其余变体自动【复用】父体共享产物，只各做自己尺寸的标题+亮点。
   ② 单独重生成某变体标题：同父体共享内容复用，只重做该尺寸的标题+亮点。 */
function _genBodyFromRow(row, sku){
  var LOCALE = { US:'en_US', CA:'en_CA', GB:'en_GB', DE:'de_DE', FR:'fr_FR', IT:'it_IT', ES:'es_ES' };
  var mkt = String(row['目标市场'] || row.marketplace || 'US').toUpperCase();
  return {
    sku: sku,
    marketplace: mkt,
    category: row['类目'] || row.category || 'PILLOW_COVER',
    season_scope: row['季节范围'] || row.season_scope || '',
    brand_name: row['品牌名'] || row.brand_name || '',
    family_id: row['父体ID'] || row.family_id || row['产品族ID'] || '',
    product_image_url: row['产品图片URL'] || row.product_image_url || '',
    locale: row['语言'] || LOCALE[mkt] || 'en_US',
    recognition_mode: row['识别方式'] || row.recognition_mode || 'VISUAL',
    title_include_material: true,
    use_keyword_db: true,
    executed_by: (typeof session === 'function' && session() && session().user_name) || 'Frontend'
  };
}
function genFamily(fid, btn){
  if (!fid){ toast('父体编号为空'); return; }
  if (btn) btn.disabled = true;
  // [fix 09-16w] 读表 API 里 SKU 表的产品族列名是「产品族ID」（不是「父体ID」）——
  // 用错键会静默返回 0 行，前端于是提示「父体下还没有商品」而永不提交。
  API.table('SKU_输入表', { '产品族ID': fid }, 200).then(function(r){
    if (btn) btn.disabled = false;
    var all = (r.ok && r.data && r.data.data) ? r.data.data : [];
    if (!all.length) {
      // 兼容旧列名兜底
      API.table('SKU_输入表', { '父体ID': fid }, 200).then(function(r2){
        var a2 = (r2.ok && r2.data && r2.data.data) ? r2.data.data : [];
        if (!a2.length){ toast('父体 ' + fid + ' 下还没有商品 —— 先去「商品资料填写」，把「父体」选成 ' + fid); return; }
        _genFamilySubmit(fid, a2);
      });
      return;
    }
    _genFamilySubmit(fid, all);
  });
}
function _genFamilySubmit(fid, all){
    if (!all.length){ toast('父体 ' + fid + ' 下还没有商品 —— 先去「商品资料填写」，把「父体ID」填成 ' + fid); return; }
    // 父体是**按站点**的（老猫 2026-09-15 定案：不存在跨站点父体），所以按站点分组展示。
    var byMkt = {};
    for (var ai = 0; ai < all.length; ai++){
      var am = String(all[ai]['目标市场'] || all[ai]['marketplace'] || 'US').toUpperCase();
      (byMkt[am] = byMkt[am] || []).push(all[ai]);
    }
    var mkts = Object.keys(byMkt).sort();
    var defMkt = mkts.indexOf('US') >= 0 ? 'US' : mkts[0];
    /* [fix 09-16am] 原来是浏览器原生 window.prompt 选站点 —— 风格不搭、部分浏览器会拦截，
       且看不出每个站点各有多少商品。改为系统弹窗：站点带商品数、勾选、默认 US。
       全部不勾 = 全部站点（再确认一次）。 */
    var mHtml = '<div style="font-size:12.5px;color:#5A6663;line-height:1.7;margin-bottom:11px">父体 <b>' + fid + '</b> 下共 <b>' + all.length + '</b> 个商品，按站点分组：</div>' +
      '<div style="display:flex;flex-direction:column;gap:7px">' +
        mkts.map(function(m){
          return '<label style="display:flex;align-items:center;gap:9px;font-size:13px;padding:8px 11px;border:1px solid #E8ECEA;border-radius:9px;cursor:pointer">' +
            '<input type="checkbox" class="fam-pick" value="' + m + '"' + (m === defMkt ? ' checked' : '') + '>' +
            '<b>' + m + '</b><span style="color:#8A9390">（' + byMkt[m].length + ' 个商品）</span>' +
          '</label>';
        }).join('') +
      '</div>' +
      '<div style="font-size:11.5px;color:#9AA0A6;margin-top:10px;line-height:1.7">' +
        '<b>不勾任何站点</b> = 生成全部站点（会再确认一次）。<br>' +
        '提交后：<b>第一个变体做共享内容</b>（识别结果 / 五点 / 后台搜索词），其余尺寸自动复用，只各写自己的标题和亮点。' +
      '</div>';
    openModal('生成文案 · 父体 ' + fid, mHtml, function(close){
      var picks = [];
      Array.prototype.forEach.call(document.querySelectorAll('input.fam-pick'), function(cb){ if (cb.checked) picks.push(cb.value); });
      var rows = [];
      if (!picks.length){
        if (!window.confirm('你没有勾选任何站点 —— 确定要生成全部 ' + all.length + ' 个商品（' + mkts.join('/') + '）吗？')) return;
        rows = all;
      } else {
        for (var wi = 0; wi < picks.length; wi++){ if (byMkt[picks[wi]]) rows = rows.concat(byMkt[picks[wi]]); }
      }
      if (!rows.length){ toast('没有匹配的商品'); return; }
      close();
      _runFamilyGen(fid, rows, picks.length ? picks.join('、') : '全部站点');
    }, '生成文案');
}

function _runFamilyGen(fid, rows, label){
    var ok = 0, fail = [], i = 0;
    function step(){
      if (i >= rows.length){
        toast('「生成文案 ' + fid + '」已提交 ' + ok + ' 个商品（' + label + '）' + (fail.length ? '，失败 ' + fail.length + ' 个：' + fail.join('、') : '') + '（首个变体生成共享内容，其余自动复用）');
        if (typeof render === 'function') setTimeout(function(){ render(); }, 400);   // [fix 09-16ak] 提交后刷新，任务进清单
        return;
      }
      var row = rows[i++]; var sku = row['SKU'] || row.sku || '';
      if (!sku){ step(); return; }
      API.generate(_genBodyFromRow(row, sku)).then(function(r2){
        if (r2.ok && r2.data && r2.data.success) ok++; else fail.push(sku);
        step();
      });
    }
    step();
}
function regenVariantTitle(sku, btn){
  if (!sku){ toast('SKU 为空'); return; }
  if (btn) btn.disabled = true;
  API.table('SKU_输入表', { 'SKU': sku }, 1).then(function(r){
    var row = (r.ok && r.data && r.data.data && r.data.data[0]) || {};
    API.generate(_genBodyFromRow(row, sku)).then(function(r2){
      if (btn) btn.disabled = false;
      if (r2.ok && r2.data && r2.data.success) toast('已提交「单独重生成标题」：' + sku + ' —— 复用父体的 9维档案/五点/Backend，只重做这个尺寸的标题和亮点');
      else toast('提交失败：' + ((r2.data && r2.data.error) || '请检查网络'));
    });
  });
}

/* [二期需求1] 商品模板 —— 2.3 页面「另存为模板 / 用模板填充 / 删除模板」
   设计要点：模板只记「每次都要重复填」的属性；SKU 编号 / 产品图片 / 父体ID 这三个逐商品不同的
   **不写入模板、填充时也不覆盖**（避免把上一条商品的专有信息带到下一条）。 */
var TPL_CACHE = [];
function tplInit(){
  var sel = document.getElementById('tpl-select');
  if (!sel) return;
  API.template({ action: 'list' }).then(function (r) {
    var list = (r && r.data && r.data.templates) ? r.data.templates : [];
    TPL_CACHE = list;
    sel.innerHTML = '<option value="">（选择模板一键填充）</option>' + list.map(function (t) {
      return '<option value="' + encodeURIComponent(t.name) + '">' + t.name + (t.market ? '（' + t.market + '）' : '') + '</option>';
    }).join('');
    var hint = document.getElementById('tpl-hint');
    if (hint && !list.length) hint.innerHTML = '还没有模板 —— 把常用属性填好后点「<b>另存为模板</b>」，下次一键填充。';
  });
}
function tplFill(){
  var sel = document.getElementById('tpl-select');
  var name = sel ? decodeURIComponent(sel.value || '') : '';
  if (!name){ toast('先选一个模板'); return; }
  var t = null;
  for (var i = 0; i < TPL_CACHE.length; i++) { if (TPL_CACHE[i].name === name) t = TPL_CACHE[i]; }
  if (!t){ toast('模板内容读不到，请刷新后重试'); return; }
  var p = t.payload || {};
  function set(id, v){ var e = document.getElementById(id); if (e && v !== undefined && v !== null && String(v) !== '') e.value = String(v); }
  set('nsku-entity', p.product_entity); set('nsku-quantity', p.quantity);
  set('nsku-brand', p.brand_name);      set('nsku-category', p.category);
  set('nsku-season', p.season_scope);   set('nsku-market', p.marketplace);
  set('nsku-material', p.material);     set('nsku-craft', p.craft);
  set('nsku-structure', p.structure);   set('nsku-function', p['function']);
  set('nsku-inclusion', p.inclusion);   set('nsku-care', p.care);
  set('nsku-certification', p.certification); set('nsku-prohibited', p.prohibited_claims);
  // 尺寸：按模板勾选。⚠️ 尺寸下拉是「按站点单位」显示的（US 用 inch、欧站用 cm），
  // 所以模板存的尺寸与当前站点的可选项可能字面对不上 —— 这时**必须显性告知**，不能静默不勾。
  // [fix 09-16v] 先按模板站点把尺寸选项刷成对应单位（US/CA/GB=inch，欧站=cm），再勾选 —— 否则必然错位
  if (typeof refreshSizeChoices === 'function') refreshSizeChoices(p.marketplace || 'US');
  var box = document.getElementById('nsku-dims');
  var sizeNote = '', sizeHit = 0, sizeTotal = 0;
  if (box && Array.isArray(p.sizes) && p.sizes.length){
    sizeTotal = p.sizes.length;
    var cbs = box.querySelectorAll('input[type=checkbox]');
    for (var k = 0; k < cbs.length; k++){ var ok = p.sizes.indexOf(cbs[k].value) >= 0; cbs[k].checked = ok; if (ok) sizeHit++; }
    if (sizeHit > 0 && sizeHit === sizeTotal) sizeNote = '，尺寸也勾好了 ' + sizeHit + ' 个（可修改）';
    else if (sizeHit > 0) sizeNote = '；尺寸勾上 ' + sizeHit + '/' + sizeTotal + ' 个（其余与本站点下拉项对不上，请手动勾选）';
    else sizeNote = '；⚠️ 模板里的尺寸（' + p.sizes.join(' / ') + '）与本站点下拉项对不上（下拉按站点单位显示，US 是 inch、欧洲站是 cm），<b>请手动勾选尺寸</b>';
  }
  toast('已用模板「' + name + '」填充' + sizeNote + '；SKU 编号、图片、父体ID 未动');
}
function tplSaveAs(){
  var name = (window.prompt('给这套资料起个模板名（例如：抱枕套·faux linen 双面印刷）', '') || '').trim();
  if (!name) return;
  function val(id){ return (document.getElementById(id)||{}).value || ''; }
  var dims = (typeof checkedVals === 'function') ? checkedVals('nsku-dims') : [];
  var payload = {
    marketplace: val('nsku-market') || 'US', category: val('nsku-category'),
    season_scope: val('nsku-season'), brand_name: val('nsku-brand'),
    product_entity: val('nsku-entity'), quantity: val('nsku-quantity'),
    material: val('nsku-material'), craft: val('nsku-craft'),
    structure: val('nsku-structure'), 'function': val('nsku-function'),
    inclusion: val('nsku-inclusion'), care: val('nsku-care'),
    certification: val('nsku-certification'), prohibited_claims: val('nsku-prohibited'),
    sizes: dims
  };
  var blank = 0;
  for (var kk in payload){ if (kk !== 'sizes' && !String(payload[kk]).trim()) blank++; }
  if (blank >= 12){ toast('表单几乎是空的，先填好资料再存模板'); return; }
  var sess = (typeof session === 'function') ? session() : null;
  API.template({ action: 'save', name: name, created_by: (sess && sess.user_name) || '前端', payload: payload }).then(function (r) {
    if (r && r.ok && r.data && r.data.success){ toast('模板「' + name + '」已保存（同名会自动覆盖）'); tplInit(); }
    else { toast('保存失败：' + ((r && r.data && r.data.error) || '请检查网络')); }
  });
}
function tplDelete(){
  var sel = document.getElementById('tpl-select');
  var name = sel ? decodeURIComponent(sel.value || '') : '';
  if (!name){ toast('先在左侧选中要删的模板'); return; }
  if (!window.confirm('确定删除模板「' + name + '」？已生成的商品不受影响。')) return;
  API.template({ action: 'delete', name: name }).then(function (r) {
    if (r && r.ok && r.data && r.data.success){
      toast(r.data.deleted ? ('模板「' + name + '」已删除') : ('模板「' + name + '」不存在（可能已被删）'));
      tplInit();
    } else { toast('删除失败：' + ((r && r.data && r.data.error) || '请检查网络')); }
  });
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
    if (b.id === 'tpl-apply'){ tplFill(); return; }
    if (b.id === 'tpl-save'){ tplSaveAs(); return; }
    if (b.id === 'tpl-del'){ tplDelete(); return; }
    var gf = b.getAttribute('data-genfam');
    if (gf){ genFamily(gf, b); return; }
    var rv = b.getAttribute('data-regen');
    if (rv){ regenVariantTitle(rv, b); return; }
    var sku = b.getAttribute('data-sku');
    if (sku) window.CUR_SKU = sku;
    var go = b.getAttribute('data-go');
    if (go) {
      // [fix 09-02] 跳「商品资料填写」且不带 data-sku = 新建意图 → 清残留 CUR_SKU，避免误进编辑模式(新增产品模块消失)
      if (go.indexOf('sku-detail') === 0 && !sku) window.CUR_SKU = undefined;
      location.hash = go;
    }
    var copy = b.getAttribute('data-copy');
    if (copy) copyText(decodeURIComponent(copy));
    var todo = b.getAttribute('data-todo');
    if (todo) toast(todo);
  });

  window.onhashchange = render;
  render();
}
