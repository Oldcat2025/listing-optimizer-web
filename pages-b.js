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
            btn('详情')
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
    var cp = btn('复制');
    return '<div class="cols c21">' +
      '<div>' +
        copybox('标题 Title', 'Watercolor Hydrangea Pillow Covers 18x18 Set of 2, Dusty Blue Farmhouse Cushion Cases',
          '<b>74</b> / 75 字符', cp) +
        copybox('亮点 Highlights', 'soft watercolor floral, dusty blue &amp; cream, hidden zipper, double-sided print, faux linen texture, cottage &amp; farmhouse decor, covers only',
          '<b>121</b> / 125 字符 · 7 个短语', cp) +
        copybox('五点描述 · 第 1 条（讲清最容易误会的地方）', 'COVERS ONLY, INSERTS NOT INCLUDED — this set includes two 18x18 inch pillow covers …',
          '<b>318</b> 字符', cp) +
        copybox('五点描述 · 第 2 条（讲图案与视觉）', 'Hand-painted watercolor hydrangea blooms in dusty blue and warm cream …',
          '<b>341</b> 字符', cp) +
        copybox('五点描述 · 第 3 条（讲用在哪）', 'Sized for standard 18x18 inserts and works on a sofa, accent chair or reading nook …',
          '<b>327</b> 字符', cp) +
        copybox('五点描述 · 第 4 条（讲材质与保养）', 'Woven from faux linen with a soft slub texture; machine washable on cold …',
          '<b>309</b> 字符', cp) +
        copybox('五点描述 · 第 5 条（讲买来干什么）', 'A ready-to-give refresh for spring and summer styling, housewarming …',
          '<b>335</b> 字符', cp) +
        copybox('后台搜索词 Backend', 'cushion cases throw covers hydrangea watercolour linen look sofa accent couch decor …',
          '<b>244</b> / 249 字节', cp, true) +
      '</div>' +
      '<div>' +
        panel('这套文案是怎么来的', kv([
          ['商品 / 站点','FX-03 / 美国'],
          ['任务编号','RUN-260818-0007'],
          ['文案版本','v1'],
          ['AI 指令版本','PR-v7'],
          ['模型版本','MDL-v3'],
          ['参数版本','P-v4'],
          ['平台规则','AMZ-RULES-US-2026-08'],
          ['关键词数据','8-12 版'],
        ]), {sub:'出问题时按这几项就能复现'}) +
        panel('五项检查', table(['检查项','结论'],[
          ['执行过程完整',chip('通过','ok')],
          ['语义正确',chip('通过','ok')],
          ['信息密度达标',chip('通过','ok')],
          ['字段之间不重复',chip('通过','ok')],
          ['选词准入合规',chip('通过','ok')],
        ]), {flush:true, note:'<b>「能否上架 = 可以」由这五项自动判定</b>，任何角色都无法手动打开。'}) +
        panel('中文对照（仅供核对，不要上架）', '<div style="font-size:13px;color:var(--t-2);line-height:1.7">' +
          '<b>标题</b>：水彩绣球花抱枕套 18x18 两只装，灰蓝色田园风靠垫套<br><br>' +
          '<b>亮点</b>：柔和水彩花卉，灰蓝配奶油白，隐形拉链，双面印花，仿亚麻质感，乡村田园装饰，仅含外套' +
          '</div>') +
        '<div class="btnrow">'+btn('看检查报告','btn')+btn('看选词记录')+btn('整套复制')+'</div>' +
      '</div>' +
    '</div>';
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
    return tabs(['五项检查','字段覆盖','反向理解','数据完整性','平台合规']) +

    panel('检查一 · 执行过程完整', table(
      ['检查什么','要求','实际','结论'],
      [
        ['关键词表读全了吗','读到的行数 = 表里的行数','<span class="num">21408 / 21408</span>',chip('通过','ok')],
        ['有没有悄悄丢掉的行','必须是 0','<span class="num">0</span>',chip('通过','ok')],
        ['平台规则多久没复核','不超过 90 天','<span class="num">1 天</span>',chip('通过','ok')],
        ['用的关键词数据对不对季节','必须和商品的季节款式一致','四季款',chip('通过','ok')],
        ['广告数据归因方式','—','以官方搜索表现为主源',chip('已标注','sys')],
        ['能不能分清连带销售','—','<span class="m">不能</span>',chip('能力边界·已写明','warn')],
      ]
    ), {flush:true, note:'<b>最后两行不是失败，是诚实</b>：「连带销售的识别」客观上拿不到数据。系统把它写成报告里的一个明确字段，而不是含糊带过——任何人拿到这份文案都知道它的证据边界在哪。'}) +

    panel('检查四 · 字段之间不重复', table(
      ['检查什么','要求','实际','结论'],
      [
        ['亮点相对标题有没有新信息','至少 3 个','<span class="num">4</span>',chip('通过','ok')],
        ['亮点有没有讲新的关系类型','至少 2 种','<span class="num">2</span>',chip('通过','ok')],
        ['有没有机械重复的字','必须是 0','<span class="num">0</span>',chip('通过','ok')],
        ['有效字数 = 总字数 − 浪费掉的','—','<span class="num">121 − 0 = 121</span>',chip('通过','ok')],
        ['后台词和前台重不重','不能重','<span class="num">0 处重复</span>',chip('通过','ok')],
      ]
    ), {flush:true}) +

    '<div class="cols c2">' +
      panel('哪个内容写在了哪个字段', table(
        ['内容','标题','亮点','五点','后台词'],
        [
          ['商品身份（抱枕套）','●','—','●','—'],
          ['尺寸 18x18','●','—','●','●'],
          ['两个装','●','—','●','—'],
          ['绣球花图案','●','●','●','●'],
          ['灰蓝色','●','●','—','●'],
          ['田园风','●','●','●','●'],
          ['仿亚麻材质','—','●','●','●'],
          ['只含外套（重要提醒）','—','●','●','—'],
          ['沙发场景','—','—','●','●'],
        ]
      ), {flush:true, note:'看最后一行：<b>后台词只补前台没写到的内容</b>（沙发场景、同义词），不是把前台说过的话再说一遍。'}) +

      panel('反向理解测试', kv([
        ['怎么测的','另一个 AI 只看最终四段文案'],
        ['它读出来这是什么','抱枕套，18x18，两个装'],
        ['它读出来适合谁','喜欢田园/乡村装饰风格的人'],
        ['它读出来为什么买','换季软装、送礼、沙发和阅读角搭配'],
        ['它读出来主图案','水彩绣球花'],
        ['它读出来关键提醒','只含外套，不含内芯'],
        ['和你的商品对得上吗',chip('完全一致','ok')],
      ]) + '<div style="margin-top:14px">'+callout('','人群怎么描述是有规矩的',
        '它读出来的人群是「<b>喜欢田园装饰的人</b>」——这是按偏好描述。如果文案里出现 women / moms / families 这类<b>凭空编的人口属性</b>，系统会直接拦截，不让上架。')+'</div>') +
    '</div>' +

    panel('八项质量门禁对照', table(
      ['业务规范的八项门禁','落在哪项检查里','本例结果'],
      [
        ['事实一致（covers 写成 pillows 之类）','检查二 · 语义正确（含事实比对）',chip('通过','ok')],
        ['主定位（有没有写漂、写成多个节日并列）','检查二 · 语义正确（含<b>主定位漂移比对</b>）',chip('通过','ok')],
        ['字段准入（低价值材质/工艺挤占标题）','检查五 · 选词准入合规',chip('通过','ok')],
        ['跨字段增量（亮点重复标题）','检查四 · 字段之间不重复',chip('通过','ok')],
        ['内容发育（明显偏短还漏高价值关系）','检查三 · 信息密度达标',chip('通过','ok')],
        ['COSMO 关系（只有词、没有关系）','检查三（新关系数）+ 下方关系覆盖表',chip('通过','ok')],
        ['Backend（重复前台/超字节/禁词/没穷尽）','检查一（字节与穷尽）+ 检查四（不重复前台）',chip('通过','ok')],
        ['本地化 / SKU（尺寸串值/站点直译/跨季节污染）','检查一 · 数据完整性（<b>季节、串值、直译三个具名子项</b>）',chip('通过','ok')],
      ]
    ), {flush:true, sub:'业务规范八项门禁 -> 本系统五项检查的完整映射',
      note:'其中「主定位漂移」和「尺寸串值 / 站点直译 / 跨季节污染」两项原先藏在别的检查里说不清，现在做成<b>具名子项</b>--报告上能直接看到这两项的单独结论。'}) +

    panel('商品关系覆盖（COSMO 关系图）', table(
      ['关系类型','回答什么问题','这套文案怎么写的','写进了哪'],
      [
        ['商品 -> 季节 / 场合','什么时候用','spring &amp; summer styling, seasonal refresh','亮点 · 五点 5'],
        ['商品 -> 图案 / 颜色 / 风格','看起来怎样','watercolor hydrangea, dusty blue &amp; cream','标题 · 亮点'],
        ['商品 -> 家具 / 房间','放在哪里','sofa, accent chair, reading nook','五点 3'],
        ['商品 -> 购买目的','为什么买','seasonal home refresh, housewarming','五点 5'],
        ['商品 -> 偏好人群','什么偏好的人喜欢','cottage &amp; farmhouse decor lovers（按偏好，不编人口）','亮点'],
        ['功能 -> 消费者收益','事实有什么价值','double-sided print, hidden zipper -> 使用体验','亮点 · 五点 4'],
        ['商品 -> 情绪结果','空间有什么感觉','（弱：柔和水彩的氛围未单列成情绪表达）',chip('部分覆盖','warn')],
        ['事实 -> 预期控制','如何减少误购','covers only, inserts not included','亮点 · 五点 1'],
      ]
    ), {flush:true, sub:'交付物之一：这套文案建成了哪些"商品-场景-目的-收益"关系',
      note:'每条关系必须同时满足四件事：<b>事实允许、与主定位兼容、有人会这样理解/搜索、读起来像自然商品文案</b>。<br>第 7 行是诚实展示：不是每套文案八类全满，缺的写明原因，不硬凑。人群只按偏好/场景/目的描述，凭空的人口属性在违禁词页硬拦。'});
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
    return stats([
      ['候选词总数','341','',' ',false],
      ['进了标题','6','拒绝 41','ok',false],
      ['进了亮点','12','',' ',false],
      ['下沉到五点/后台','61','',' ',false],
      ['被拒绝','262','每条都有理由','',false],
    ],5) +

    panel('证据来源说明', evLegend(), {sub:'四类证据分开看，不合并成分数',
      note:'<b>为什么不合成一个分数</b>：商品事实能否决一个词，但市场数据不能；账户数据说明「我们卖得动」，反查说明「爆款从哪来」。混成一个总分，就说不清一个词到底凭什么进来。'}) +

    toolbar(
      [inp('搜索候选词'), sel('全部去向',['进标题','进亮点','下沉五点','下沉后台词','被拒绝']),
       sel('全部类型',['关键词','商品事实','关系表达','派生长尾']),
       sel('全部相关度',['核心','相近','冲突'])],
      [btn('导出 CSV')]
    ) +
    table(
      ['候选词','类型','承担什么任务','相关度','证据','删掉会损失什么','挤占代价','去向','理由'],
      [
        ['<span class="m">pillow covers</span>','商品事实','说清这是什么',chip('核心','ok'),ev('FAS'),'买家找不到','<span class="num">—</span>',chip('进标题','ok'),'商品身份，唯一必进的内容'],
        ['<span class="m">18x18</span>','关键词','帮买家筛尺寸',chip('核心','ok'),ev('FASR'),'买错尺寸','<span class="num">0.12</span>',chip('进标题','ok'),'尺寸是硬筛选条件'],
        ['<span class="m">hydrangea</span>','关键词','说清图案',chip('核心','ok'),ev('FAR'),'买家不知道好不好看','<span class="num">0.31</span>',chip('进标题','ok'),'图案是这个商品的选择理由'],
        ['<span class="m">throw pillow covers for couch</span>','派生长尾','—',chip('相近','warn'),ev('AS'),'几乎不损失','<span class="num">0.62</span>',chip('下沉后台词','sys'),'占的位置比它带来的价值贵'],
        ['<span class="m">covers only</span>','关系表达','管理买家预期',chip('核心','ok'),ev('F'),'买家会退货','<span class="num">0.44</span>',chip('进亮点','sys'),'标题放不下，但这句不能丢'],
        ['<span class="m">waterproof</span>','关键词','—',chip('冲突','fail'),ev('A'),'—','<span class="num">—</span>',chip('被拒绝','fail'),'和商品事实冲突 · 你标了「不能说」'],
        ['<span class="m">pillow inserts</span>','关键词','—',chip('冲突','fail'),ev('AS'),'—','<span class="num">—</span>',chip('被拒绝','fail'),'本商品不含内芯，写了会误导'],
        ['<span class="m">cushion covers for women</span>','派生长尾','—',chip('相近','warn'),ev('A'),'—','<span class="num">—</span>',chip('被拒绝','fail'),'凭空编造人群属性 · 系统硬拦截'],
        ['<span class="m">decorative pillow case</span>','关键词','带来搜索流量',chip('相近','warn'),ev('AS'),'少一点流量','<span class="num">0.58</span>',chip('下沉后台词','sys'),'和标题里的词意思重复'],
      ]
    );
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
    return callout('','待审核 · FX-03 / 美国 / v1',
      '五项检查全部通过。你放行之后，运营复制上架，再回来登记 ASIN，这条商品才进入效果跟踪。') +

    '<div class="cols c2">' +
      panel('放行 / 打回', '<div class="form">'+
        fld('你的结论', pick(['放行','打回 · 让运营补商品资料','打回 · 只重做某个字段','转人工处理'])) +
        fld('打回哪个字段（选了打回才需要填）', pick(['—','标题','亮点','五点描述','后台搜索词'])) +
        fld('审核意见', '<textarea class="ctl" rows="4" placeholder="写给下一个人看的，会存进操作记录"></textarea>') +
      '</div><div class="btnrow" style="margin-top:14px">'+btn('提交结论','btn')+'</div>') +

      panel('人工改判选词结论', '<div class="form">'+
        fld('要改判哪个词', pick(['cushion covers（现在是：被拒绝）','decorative pillow case（现在是：下沉后台词）'])) +
        fld('改判为', pick(['进标题','进亮点','下沉五点','下沉后台词','被拒绝'])) +
        fld('理由 <span style="color:var(--red)">*必填</span>', '<textarea class="ctl" rows="3" placeholder="为什么你认为系统判错了"></textarea>') +
      '</div>' +
      '<div class="btnrow" style="margin-top:14px">'+btn('提交改判并自动重检','btn--danger')+'</div>' +
      callout('','改判之后会发生什么（自动完成，不用你操心）',
        '① 改判和理由写进<b>台账</b>（谁、什么时候、改了什么、为什么）<br>' +
        '② 系统<b>自动重跑五项检查</b>——只重跑检查，不重写文案，几秒钟出结果<br>' +
        '③ 检查通过 → 「能否上架」恢复为可以，并标注<b>本条经过人工干预</b><br>' +
        '④ 检查不通过 → 告诉你哪一项被你的改判破坏了') ) +
    '</div>' +

    panel('人工改判台账（近 10 条）', table(
      ['时间','审核人','商品/站点','改了哪个词','改判前 → 后','理由','自动重检结果'],
      [
        ['<span class="m">8-17 16:22</span>','Lita','FX-01 / 英国','<span class="m">cushion covers</span>','被拒绝 → 进标题','英国当地就叫 cushion，系统按美国说法误判',chip('重检通过','ok')],
        ['<span class="m">8-15 11:08</span>','Lita','FX-02 / 美国','<span class="m">sofa throw pillow</span>','下沉后台 → 进亮点','场景词对这个商品是选择理由',chip('重检通过','ok')],
      ]
    ), {flush:true, note:'台账<b>只增不改不删</b>。将来要回答「这条文案为什么和系统原判不一样」，靠的就是这张表。'});
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
    return table(
      ['任务编号','商品/站点','为什么进来','失败字段','已重做','等了多久','谁在处理',''],
      [
        ['<span class="m">RUN-260817-0031</span>','FX-05 / 美国','重做 3 次仍不通过','亮点','3/3','<span class="m">18 小时</span>','—',btn('认领','btn')],
        ['<span class="m">RUN-260816-0012</span>','FX-09 / 美国','商品资料有必填项没填','—','0/3','<span class="m">2 天</span>','Lita',btn('继续处理')],
      ]
    ) +
    callout('warn','这两条性质完全不同，别找错人',
      '<b>FX-05</b> —— 系统尽力了，但可用的词确实不够。要么补关键词数据，要么接受亮点写短一点。<b>这是系统侧的事</b>。<br>' +
      '<b>FX-09</b> —— 婴儿床笠的「认证/安全」没填。<b>这不是系统的问题</b>，让运营补资料就行。');
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
    return panel('导入向导', steps([
      ['done','选文件','站点词库_US_20260818.xlsx · 21,408 行 × 34 列','—'],
      ['done','比对列名','34 列全部对上（自动忽略了 3 处空格差异）','—'],
      ['done','抽查数值单位','7 项已核对：搜索量、转化共享、搜索排名…','—'],
      ['now','预览并确认','看下面的检查结果，确认后建快照','—'],
      ['wait','建快照','美国 · 抱枕套 · 四季款 · 8-18 版','—'],
    ])) +

    '<div class="cols c2">' +
      panel('完整性证明（正式导入前的预演）', kv([
        ['表里有多少行','21,408'],
        ['系统读了多少行','21,408'],
        ['差多少','0'],
        ['重复行（保留来源）','142'],
        ['有缺失指标的行','1,033'],
        ['指标互相打架的行','87'],
        ['搜索排名没值 → 写空','4,910'],
      ]) + '<div style="margin-top:12px">'+chip('可以建快照','ok')+'</div>') +

      panel('检查告警', table(['级别','问题','说明'],[
        [chip('警告','warn'),'指标打架','87 行的官方排名和估算搜索量对不上 → 自动降权，<b>不丢弃</b>'],
        [chip('提示','neutral'),'语义待确认','曝光/点击两列的具体含义未确认，已标记后入库'],
        [chip('通过','ok'),'列名有没有变','和上一份快照完全一致'],
      ]), {flush:true}) +
    '</div>' +

    panel('已有快照', table(
      ['快照','站点','类目','季节款式','数据日期','行数','被多少任务用过','状态',''],
      [
        ['<span class="m">US-抱枕套-四季-0812</span>','美国','抱枕套','四季款','8-12','<span class="num">21,203</span>','<span class="num">14</span>',chip('默认 · 只读','ok'),btn('查看')],
        ['<span class="m">US-抱枕套-四季-0805</span>','美国','抱枕套','四季款','8-05','<span class="num">20,988</span>','<span class="num">9</span>',chip('只读','neutral'),btn('查看')],
        ['<span class="m">GB-抱枕套-四季-0805</span>','英国','抱枕套','四季款','8-05','<span class="num">11,472</span>','<span class="num">6</span>',chip('默认 · 已过 13 天','warn'),btn('查看')],
        ['<span class="m">US-抱枕套-圣诞-0810</span>','美国','抱枕套','圣诞款','8-10','<span class="num">6,341</span>','<span class="num">3</span>',chip('默认 · 只读','ok'),btn('查看')],
      ]
    ), {flush:true, note:'圣诞款和四季款是<b>两份独立的数据</b>。生成圣诞款文案时，系统不会去读四季款的词表——这是在存储层面就隔开的，不靠 AI 自觉。'});
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
    return '<div class="cols c2">' +
      panel('搜索表现报告（主要依据）', kv([
        ['最新报表','8-10 ~ 8-16'],
        ['覆盖商品','9 / 9'],
        ['查询行数','3,842'],
        ['数据滞后','5 天（新品前 14 天不参与判断）'],
        ['数据性质','官方，精确到商品'],
      ]) + '<div class="btnrow" style="margin-top:12px">'+btn('上传新报表','btn')+'</div>') +
      panel('广告报告（花费 + 推断）', kv([
        ['最新报表','8-10 ~ 8-16'],
        ['广告组数','23'],
        ['只投一个商品的组','14 → 可推断到商品'],
        ['投多个商品的组','7 → 只能算花费'],
        ['没建对应关系的','2 → 需要维护'],
      ]) + '<div class="btnrow" style="margin-top:12px">'+btn('上传新报表','btn')+btn('去维护对应关系')+'</div>') +
    '</div>' +

    panel('数据归到了哪一层', table(
      ['层级','来源','行数','占比','能用来判断什么','是不是推断的'],
      [
        ['官方 · 精确到商品','搜索表现','<span class="num">3,842</span>','<span class="num">61%</span>','这个词能不能带来成交',chip('不是','ok')],
        ['推断 · 精确到商品','广告 + 对应表','<span class="num">1,410</span>','<span class="num">22%</span>','参考用，必须标「推断」',chip('是','warn')],
        ['只能算花费','广告','<span class="num">702</span>','<span class="num">11%</span>','<b>只作花费</b>，不参与商品判断',chip('不是','neutral')],
        ['估算 · 自然流量','粗估','<span class="num">318</span>','<span class="num">5%</span>','标「估算」，不当自然流量用',chip('是','warn')],
        ['不明','—','<span class="num">64</span>','<span class="num">1%</span>','不参与',chip('不是','neutral')],
      ]
    ), {flush:true, note:'<b>还有两件事系统做不到</b>：分不清「连带销售」，也分不清「自然流量和广告流量」。两者都做成随文案落库的明确标记，而不是在报告里写一段话解释。'}) +

    callout('','给客户的一条可选建议（不属于本系统交付范围）',
      '如果把广告组拆成「<b>一个广告组只投一个商品</b>」，推断的准确率能接近 100%，账户数据的质量会明显上一档。');
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
    return toolbar([sel('全部站点',['美国','英国']), sel('全部置信度',['只投一个商品','投多个商品','未对应'])],
      [btn('批量导入'), btn('新增对应','btn')]) +
    table(
      ['站点','广告活动','广告组','对应商品','商品数','置信度','核对日期',''],
      [
        ['美国','<span class="m">SP-Pillow-Auto</span>','<span class="m">AG-Floral-18</span>','<span class="m">FX-03</span>','<span class="num">1</span>',chip('只投一个','ok'),'<span class="m">8-16</span>',btn('编辑')],
        ['美国','<span class="m">SP-Pillow-Manual</span>','<span class="m">AG-Xmas-All</span>','<span class="m">FX-04, FX-05, FX-06</span>','<span class="num">3</span>',chip('投多个','warn'),'<span class="m">8-16</span>',btn('编辑')],
        ['英国','<span class="m">SP-Cushion-GB</span>','<span class="m">AG-Floral-GB</span>','<span class="m">FX-03</span>','<span class="num">1</span>',chip('只投一个','ok'),'<span class="m">8-16</span>',btn('编辑')],
        ['美国','<span class="m">SP-Brand-Def</span>','<span class="m">AG-Defense</span>','<span class="m dim">—</span>','<span class="num">0</span>',chip('未对应','fail'),'<span class="m">—</span>',btn('去建','btn')],
      ]
    );
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
    return toolbar([inp('输入竞品 ASIN，例如 B0BQ39Y64F'), sel('美国',['美国','英国']), sel('全部证据',['强（前三名）','弱（前十名）'])],
      [btn('查询','btn')]) +

    stats([
      ['命中多少个搜索词','148','强 37 / 弱 111','',false],
      ['归成几类入口','6','按品类/场景/尺寸/颜色/图案/风格','',false],
      ['最大一类占比','31.4%','花卉装饰','',false],
      ['数据从哪来','关键词表倒推','不用额外买反查工具','',true],
    ],4) +

    panel('这个竞品的入口结构 · B0BQ39Y64F', table(
      ['入口类型','代表搜索词','命中词数','点击份额合计','转化份额合计','证据强度'],
      [
        ['花卉装饰','<span class="m">floral pillow covers</span>','31','<span class="num">31.4%</span>','<span class="num">28.9%</span>',chip('强','ok')],
        ['春季换新','<span class="m">spring decor pillow covers</span>','24','<span class="num">18.2%</span>','<span class="num">21.0%</span>',chip('强','ok')],
        ['沙发场景','<span class="m">couch decor pillows</span>','22','<span class="num">14.7%</span>','<span class="num">12.3%</span>',chip('强','ok')],
        ['尺寸筛选','<span class="m">18x18 pillow covers</span>','19','<span class="num">11.1%</span>','<span class="num">13.8%</span>',chip('强','ok')],
        ['田园风格','<span class="m">farmhouse pillow covers</span>','29','<span class="m dim">只在前十</span>','<span class="m dim">只在前十</span>',chip('弱','warn')],
        ['向日葵图案','<span class="m">sunflower pillow covers</span>','23','<span class="m dim">只在前十</span>','<span class="m dim">只在前十</span>',chip('弱','warn')],
      ]
    ), {flush:true, note:'这印证了一条重要经验：<b>爆款的成交常常来自更宽泛的入口</b>（花卉装饰 / 春季换新 / 沙发场景），而不是最大的那个品类词。'}) +

    panel('导入外部反查数据（可选）', table(
      ['文件','导入时间','覆盖','证据级别','和倒推的关系'],
      [
        ['<span class="m">花卉爆款反查研究.xlsx</span>','8-02','5 个竞品 ASIN · 214 个词',chip('外部研究 · 参考','warn'),'只补倒推覆盖不到的入口，<b>不与强证据混算</b>'],
      ]
    ), {flush:true, sub:'倒推是主源；外部反查报告是可选补充',
      note:'倒推不用额外花钱（数据就在自己的关键词表里），<b>继续作为主源</b>。外部反查工具的报告或既有研究成果导进来时，必须标<b>来源和日期</b>，落库后 R 徽章注明「外部研究」，与倒推的 R 分开显示--证据分层，不互相冒充。'});
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
    return stats([
      ['最重要','9','全部用上','ok',false],
      ['重要','17','用上 15 / 合法省略 2','ok',false],
      ['一般','34','','',false],
      ['次要','61','','',false],
      ['不合适','220','每条都有理由','',false],
    ],5) +
    toolbar([sel('全部等级',['最重要','重要','一般','次要','不合适']),
             sel('全部入口层级',['主入口','中尾','精准长尾','语义召回','不属入口']),
             sel('全部状态',['还没分配','已用上','需要强化','不合适','待人工裁定']),
             sel('全部角色',['帮买家找到','帮买家选择','两者都是','辅助说明'])],
      [btn('导出')]) +
    table(
      ['机会','类型','起什么作用','相关度','等级','入口层级','状态','用在哪 / 为什么没用'],
      [
        ['<span class="m">pillow covers</span>','商品实体','帮买家找到',chip('核心','ok'),'最重要',chip('主入口','sys'),chip('已用上','ok'),'标题 + 五点 + 后台词'],
        ['<span class="m">watercolor hydrangea</span>','图案','找到 + 选择',chip('核心','ok'),'最重要',chip('精准长尾','ok'),chip('已用上','ok'),'标题 + 亮点 + 五点 + 后台词'],
        ['<span class="m">18x18</span>','尺寸','帮买家找到',chip('核心','ok'),'最重要',chip('中尾','ok'),chip('已用上','ok'),'标题 + 五点 + 后台词'],
        ['<span class="m">farmhouse decor</span>','装饰风格','找到 + 选择',chip('核心','ok'),'最重要',chip('中尾','ok'),chip('已用上','ok'),'标题 + 亮点'],
        ['<span class="m">spring refresh</span>','购买目的','辅助说明',chip('相近','warn'),'重要',chip('语义召回','warn'),chip('已用上','ok'),'五点第 5 条'],
        ['<span class="m">couch decor</span>','使用场景','帮买家找到',chip('相近','warn'),'重要',chip('中尾','ok'),chip('已用上','ok'),'五点第 3 条 + 后台词'],
        ['<span class="m">gift for housewarming</span>','购买目的','辅助说明',chip('相近','warn'),'重要',chip('语义召回','warn'),chip('合法省略','warn'),'字数用完了，且不是搜索入口 —— 理由已记录'],
        ['<span class="m">velvet texture</span>','材质','帮买家选择',chip('冲突','fail'),'不合适',chip('不属入口','neutral'),chip('不合适','fail'),'和商品事实冲突：本品是仿亚麻'],
      ]
    ) +

    callout('','入口层级：四层要搭配，不是只挑最大的词',
      '<b>主入口</b>（品类/季节大词）建立身份，不因竞争大就全放弃，但控制位置；<b>中尾</b>（尺寸/套装/风格/场景连接词）是小卖家的重点；<b>精准长尾</b>（图案+季节+尺寸组合）量小但意图清晰，优先用真实出单证据；<b>语义召回</b>（同义/偏好/购买目的）补亮点、五点和后台，不得改变商品身份。<br>看上面几行：这套文案四层都有，<b>这就是"兼顾相关性与可触达性"的具体样子</b>。') +

    callout('','分类的完整体系是 12 类，这里只画了 6 类',
      '完整清单：<b>尺寸 / 颜色 / 风格 / 场景 / 功能 / 套装数量 / 图案元素 / 季节·节日 / 情绪 / 人群偏好 / 购买目的 / 商品实体</b>，一个词允许挂多个标签。本页示例只展示其中 6 类；12 类清单进 PRD 与数据库设计，一词多标签在库层面落地。');
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
    return callout('','和 ⑦ 上线跟踪是一条链',
      '这一页的建议由系统<b>每周</b>根据真实表现自动产出。<b>建议不等于生效</b>——采纳后会生成新的参数版本，必须回测确认比现在好，才能设为默认。') +
    table(
      ['词','现在的等级','建议','依据','近 4 周曝光','转化率','是不是新词'],
      [
        ['<span class="m">watercolor pillow covers</span>','假设有效','→ 已验证有效','实际入口和当初的假设一致','<span class="num">12,408</span>','<span class="num">4.1%</span>',chip('否','neutral')],
        ['<span class="m">cottage core cushion</span>','假设有效','→ 降级淘汰','连续 4 周零曝光','<span class="num">0</span>','<span class="num">—</span>',chip('否','neutral')],
        ['<span class="m">dusty blue accent pillow</span>','探索中','保持不动','样本还太少，按探索词保护','<span class="num">318</span>','<span class="num">2.2%</span>',chip('是','sys')],
      ]
    );
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
    return table(
      ['批次','时间','类型','站点','文件','行数','告警','结果'],
      [
        ['<span class="m">IMP-0042</span>','<span class="m">8-18 09:31</span>','关键词','美国','站点词库_US_20260818.xlsx','<span class="num">21,408</span>','2 个警告',chip('待确认','warn')],
        ['<span class="m">IMP-0041</span>','<span class="m">8-16 14:02</span>','搜索表现','美国','SQP_US_W33.csv','<span class="num">3,842</span>','0',chip('成功','ok')],
        ['<span class="m">IMP-0040</span>','<span class="m">8-16 13:55</span>','广告','美国','PPC_US_W33.csv','<span class="num">2,494</span>','1 个警告',chip('成功','ok')],
        ['<span class="m">IMP-0039</span>','<span class="m">8-12 10:20</span>','关键词','美国','站点词库_US_20260812.xlsx','<span class="num">21,203</span>','0',chip('成功','ok')],
        ['<span class="m">IMP-0037</span>','<span class="m">8-05 09:14</span>','关键词','英国','站点词库_GB_20260805.xlsx','<span class="num">11,472</span>','3 个警告',chip('成功','ok')],
        ['<span class="m">IMP-0036</span>','<span class="m">8-02 15:40</span>','反查研究','美国','花卉爆款反查研究.xlsx','<span class="num">214</span>','1 个警告',chip('成功 · 外部来源','warn')],
      ]
    ) +
    callout('','为什么一定要留原始文件',
      '解析规则改版之后，「同一份文件解析出来的结果变了」是必须能查清的。<b>没有原始文件，就分不清是数据源变了还是我们解析错了</b>——这个亏已经吃过。');
  }
});
