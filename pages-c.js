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
    return toolbar([sel('全部类目',['抱枕套','桌旗','婴儿床笠'])],
      [btn('对比版本'), btn('新建类目','btn')]) +
    '<div class="cols c2">' +
      panel('抱枕套 · 第 1 版', '<div class="form g2">'+
        fld('标题最多几个字符', txt('75')) + fld('标题目标区间', txt('68 ~ 75')) +
        fld('亮点最多几个字符', txt('125')) + fld('亮点目标区间', txt('110 ~ 125')) +
        fld('亮点写成什么样', pick(['逗号分隔的短语','完整句子'])) + fld('亮点几个短语', txt('5 ~ 8')) +
        fld('五点每条目标字数', txt('260 / 320 / 380')) + fld('写几条', txt('5')) +
        fld('亮点至少几个新信息点', txt('3')) + fld('亮点至少几种新关系', txt('2')) +
      '</div>') +
      panel('守卫与优先级', '<div class="form">'+
        fld('优先写哪几类入口', txt('品类, 尺寸, 套装, 季节, 场景, 颜色')) +
        fld('高风险说法（需强证据）', txt('防水, 户外, 含内芯')) +
        fld('适用人群方向', pick(['只准成人语汇','只准婴儿语汇','不限制'])) +
        fld('禁用的人群词', txt('baby, infant, toddler, children, kids, nursery, crib, playroom'),
          '婴儿床笠类目下这一项内容<b>正好相反</b>——禁的是成人语汇') +
      '</div>' +
      callout('warn','这一条是从过去的事故里长出来的',
        '以前的做法是把「成人商品禁用 baby/infant/…」<b>写死在代码里</b>。同一条规则搬到婴儿床笠上，会<b>直接把正确的文案杀掉</b>。所以方向必须由这里配置，不能写死。')) +
    '</div>' +

    panel('词与词打架时，谁让谁（全字段通用仲裁顺序）', table(
      ['顺位','谁优先','白话解释'],
      [
        ['1','商品事实与合规','事实说了不能说的，流量再大的词也不进'],
        ['2','主定位与买家预期','会把商品带偏的词，搜索量再高也拒绝'],
        ['3','搜索入口与购买筛选','高价值入口，以及尺寸/数量这类硬筛选'],
        ['4','视觉选择 / 场景 / 购买目的 / 转化关系','差异化和"为什么买"'],
        ['5','兼容长尾与字段利用率','不漂移前提下尽量多覆盖'],
        ['6','纯粹凑字符 / 凑词数','永远排最末，永远可以让'],
      ]
    ), {flush:true, sub:'出自业务规范：任何字段、任何环节里两类要求冲突，都按这个顺序裁',
      note:'最终标准不是写得最长、词最多，而是<b>每个词都有明确任务</b>：删掉任何内容都知道损失什么，加任何内容都能证明不会挤掉更高价值的候选、不会带偏主定位。'}) +

    panel('版本历史', table(['版本','生效日期','改了什么','谁改的',''],[
      ['<span class="m">第 1 版</span>','2026-08-14','初版','Oldcat',chip('当前使用','ok')],
    ]), {flush:true});
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
    return table(
      ['站点','语言','后台词上限','标点规则','分词','复合词','规则版本','上次复核',''],
      [
        ['美国','<span class="m">en-US</span>','<span class="num">249</span> 字节 '+chip('待核实','warn'),'不用逗号','英语','不拆','<span class="m">2026-08 版</span>','<span class="m">8-17</span>',btn('编辑')],
        ['英国','<span class="m">en-GB</span>','<span class="num">249</span> 字节 '+chip('待核实','warn'),'不用逗号','英语','不拆','<span class="m">2026-05 版</span>','<span class="m">5-13</span> '+chip('97 天','fail'),btn('编辑','btn')],
        ['德国','<span class="m">de-DE</span>','<span class="num">—</span>','不用逗号','德语','要拆复合词','<span class="m">—</span>','<span class="m">—</span>',btn('待建')],
        ['法国','<span class="m">fr-FR</span>','<span class="num">—</span>','不用逗号','法语','不拆','<span class="m">—</span>','<span class="m">—</span>',btn('待建')],
      ]
    ) +
    callout('stop','这张表上有两个必须先解决的问题',
      '① <b>美国后台词上限到底是 249 还是 250 没核实</b>——如果是 250，每条 Listing 白白少用 1 个字节的曝光机会。<br>' +
      '② <b>英国平台规则 97 天没复核</b>，已经超过 90 天的阈值，现在提交英国站生成会弹告警。');
  }
});

page('cfg-rules', {
  roles:['管理员'],
  guide:[
    '亚马逊的规则<b>会变</b>，所以这里存的是「某一天核对过的规则快照」，不是固定不变的常量。',
    '复核时把官方页面存档进来，系统会记录版本号和日期。',
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
    return table(['规则版本','站点','类目','核对日期','距今','官方页面存档','受影响的已上架文案',''],[
      ['<span class="m">美国 2026-08 版</span>','美国','全部','2026-08-17','<span class="num">1 天</span>',chip('已存档','ok'),'<span class="num">—</span>',btn('查看')],
      ['<span class="m">英国 2026-05 版</span>','英国','全部','2026-05-13','<span class="num">97 天</span> '+chip('超期','fail'),chip('已存档','ok'),'<span class="num">6 条</span>',btn('去复核','btn')],
    ]) +
    callout('','规则改了之后的正确做法',
      '先<b>回测</b>（拿历史任务重跑对比）→ 重新冻结标准样本 → 小范围试 → 由人决定要不要重跑。<br>' +
      '<b>绝对不能</b>规则一改就批量覆盖线上文案：已上架的文案有自己的表现历史，悄悄重写会把效果对比的基准毁掉。');
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
    return toolbar([inp('搜索词'), sel('全部等级',['高','中','低']), sel('全部站点',['通用','美国','英国'])],
      [btn('导入 CSV'), btn('新增','btn')]) +
    table(['词','风险等级','适用范围','推荐换成','匹配方式','状态'],[
      ['<span class="m">best</span>',chip('高','fail'),'通用','premium / top-rated / favorite','完整单词',chip('启用','ok')],
      ['<span class="m">100% waterproof</span>',chip('高','fail'),'通用','water-resistant','整个短语',chip('启用','ok')],
      ['<span class="m">hypoallergenic</span>',chip('高','fail'),'婴儿床笠','（资料里明确确认才放行）','完整单词',chip('启用','ok')],
      ['<span class="m">bra</span>',chip('中','warn'),'通用','—','完整单词 '+chip('防止误伤 embrace','sys'),chip('启用','ok')],
    ]) +
    panel('凭空编造的人群词（按站点语言）', table(['站点','禁用的词'],[
      ['美国 / 英国','<span class="m">women, woman, men, man, moms, mom, mothers, families, girls, boys, ladies, teens, seniors</span>'],
      ['法国','<span class="m">femmes, mamans, filles, garçons</span>'],
      ['德国','<span class="m">Frauen, Mütter, Mädchen, Jungen</span>'],
    ]), {flush:true, note:'人群只能<b>按偏好、场景、目的</b>来描述（比如「喜欢田园装饰的人」），<b>不能凭空说是给谁买的</b>。这条必须由系统硬拦，不能只写在 AI 指令里。'});
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
  body:function(){
    return callout('','这一页是「系统会越用越好」的开关',
      '指令存进数据库之后才谈得上：改一版 → 拿历史任务回测 → 确实更好才发布 → 出问题一键退回。<b>如果写死在流程里，这四步一步都做不到。</b>') +

    table(['版本','生效日期','改了什么','影响哪些环节','回测结果','状态',''],[
      ['<span class="m">PR-v7</span>','2026-08-16','写标题时必须说清"挤掉了谁"','写标题 / 反向理解','一次通过率 +2.1 个百分点',chip('当前使用','ok'),btn('看差异')],
      ['<span class="m">PR-v6</span>','2026-08-11','写亮点时要逐条列出新信息','写亮点','+0.4 个百分点',chip('历史','neutral'),btn('退回这版')],
      ['<span class="m">PR-v5</span>','2026-08-06','初版','全部','（基线）',chip('历史','neutral'),btn('退回这版')],
    ]) +

    panel('各个 AI 环节用哪版指令', table(['环节','做什么用的','指令模板','继承通用约束','最后改动'],[
      ['看商品图','认图案、颜色、构图','<span class="m">TPL-VISION-v3</span>','是','8-06'],
      ['给词分类','判断每个词在讲什么','<span class="m">TPL-INTENT-v4</span>','是','8-11'],
      ['理关系','把商品和场景/用途连起来','<span class="m">TPL-COSMO-v5</span>','是','8-11'],
      ['写标题','只写准入通过的词','<span class="m">TPL-TITLE-v7</span>','是','8-16'],
      ['写亮点','只写标题没覆盖的','<span class="m">TPL-HL-v6</span>','是','8-11'],
      ['写五点','五条各讲不同的事','<span class="m">TPL-BULLET-v6</span>','是','8-11'],
      ['写后台词','补前台的缺口','<span class="m">TPL-BACKEND-v5</span>','是','8-06'],
      ['反向理解复核','只看成品反推理解','<span class="m">TPL-JUDGE-v7</span>','是','8-16'],
    ]), {flush:true, note:'最后一行的复核环节，<b>输入只有最终四段文案</b>——它看不到主定位，否则「反向理解」就没有意义了。'});
  }
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
  body:function(){
    return table(['版本','生效日期','改了什么','回测样本','和上一版比','状态',''],[
      ['<span class="m">P-v4</span>','2026-08-14','按类目分开设置样本收缩','36 条任务','一次通过率 +1.8 个百分点',chip('当前使用','ok'),btn('详情')],
      ['<span class="m">P-v3</span>','2026-08-08','挤占阈值 0.55 → 0.60','28 条任务','+0.9 个百分点',chip('历史','neutral'),btn('退回')],
      ['<span class="m">P-v2</span>','2026-08-02','初版','—','（基线）',chip('历史','neutral'),btn('退回')],
    ]) +
    callout('warn','阈值没回测就上线，会误杀正常文案',
      '这是被标为<b>高风险</b>的一条。首个类目跑通期间，所有"不通过"都要人工看一遍，确认不是阈值定错了。');
  }
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
    return panel('AI 服务商', toolbar([sel('全部协议',['OpenAI 兼容','Gemini 原生','Anthropic','自定义'])],
      [btn('新增服务商','btn')]) + table(
      ['服务商','协议','接口地址','API 密钥','限流','超时','连通性','状态',''],
      [
        ['<span class="m">Gemini 官方</span>','Gemini 原生','<span class="m">generativelanguage.googleapis.com</span>','<span class="m">••••••••3f2a</span>','<span class="num">60/分</span>','<span class="num">120秒</span>',chip('正常 · 09:28','ok'),chip('启用','ok'),btn('测试')],
        ['<span class="m">云雾 API</span>','OpenAI 兼容','<span class="m">yunwu.ai/v1</span>','<span class="m">••••••••DY8m</span>','<span class="num">30/分</span>','<span class="num">180秒</span>',chip('正常 · 09:28','ok'),chip('启用','ok'),btn('测试')],
        ['<span class="m">云雾 API（旧）</span>','OpenAI 兼容','<span class="m">yunwu.ai/v1</span>','<span class="m">••••••••y9B4</span>','<span class="num">30/分</span>','<span class="num">180秒</span>',chip('密钥失效 401','fail'),chip('停用','neutral'),btn('轮换密钥','btn--danger')],
        ['<span class="m">Anthropic</span>','Anthropic','<span class="m">api.anthropic.com</span>','<span class="m">（还没填）</span>','<span class="num">—</span>','<span class="num">—</span>',chip('没测过','neutral'),chip('停用','neutral'),btn('去配置','btn')],
      ]
    ), {flush:true}) +

    '<div class="cols c2">' +
      panel('新增 / 编辑服务商', '<div class="form">'+
        fld('显示名称', txt('云雾 API')) +
        fld('协议类型', pick(['OpenAI 兼容','Gemini 原生','Anthropic','自定义'])) +
        fld('接口地址', txt('https://yunwu.ai/v1')) +
        fld('API 密钥', '<input class="ctl" type="password" value="••••••••••••••••">',
          '保存后<b>不能再看到明文</b>，只能整体轮换') +
        fld('鉴权放在哪', pick(['请求头 Bearer','请求头 x-goog-api-key','地址栏 ?key='])) +
        fld('限流 / 超时', txt('30 次每分钟 · 180 秒')) +
      '</div><div class="btnrow" style="margin-top:14px">'+btn('测试连通')+btn('保存','btn')+'</div>') +

      panel('可用模型清单', table(['服务商','模型','能干什么','状态'],[
        ['Gemini 官方','<span class="m">gemini-2.5-flash</span>','文本 · 看图',chip('可用','ok')],
        ['Gemini 官方','<span class="m">gemini-2.5-pro</span>','文本 · 看图 · 深度思考',chip('可用','ok')],
        ['云雾 API','<span class="m">claude-sonnet-5</span>','文本',chip('可用','ok')],
        ['云雾 API','<span class="m">gpt-image-2</span>','图像',chip('可用','ok')],
        ['Anthropic','<span class="m">claude-opus-5</span>','文本',chip('还没配置','neutral')],
      ]), {flush:true, note:'模型清单可以手填，也可以从服务商接口自动拉。<b>停用某个模型前必须先解除环节绑定</b>。'}) +
    '</div>' +

    callout('','密钥怎么走（已定方案，说明一下原理）',
      'n8n <b>不直接</b>连模型商，所有 AI 调用统一走本系统的一个中转接口，由本系统持有密钥并转发出去。<br>' +
      '<b>好处三个</b>：① 密钥永远不会出现在 n8n 的执行记录里 ② 每一次调用都能精确记账，直接喂给「用量与费用」页 ③ 换模型、换服务商不用改任何流程。<br>' +
      '<b>代价一个</b>：这个中转接口成了关键环节，它挂了所有生成都跑不动。所以必须做健康检查和明确失败，不允许悄无声息地卡住。');
  }
});

page('cfg-binding', {
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
  body:function(){
    return '<div class="cols c21">' +
      panel('各环节绑定 · MDL-v3', table(
        ['环节','做什么用的','主模型','关键参数','备用模型','校验'],
        [
          ['看商品图','认图案/颜色/构图','<span class="m">gemini-2.5-pro</span>','<span class="m">不开思考</span>','<span class="m">gemini-2.5-flash</span>',chip('会看图 ✓','ok')],
          ['防编造复核','另一个模型重看核对','<span class="m">gemini-2.5-flash</span>','<span class="m">温度 0</span>','<span class="m">—</span>',chip('会看图 ✓','ok')],
          ['给词分类','判断每个词在讲什么','<span class="m">gemini-2.5-flash</span>','<span class="m">温度 0 · 每批 200</span>','<span class="m">claude-sonnet-5</span>',chip('文本 ✓','ok')],
          ['理关系','商品与场景/用途的关系','<span class="m">gemini-2.5-pro</span>','<span class="m">温度 0.2</span>','<span class="m">claude-sonnet-5</span>',chip('文本 ✓','ok')],
          ['写标题','本地母语定稿','<span class="m">claude-sonnet-5</span>','<span class="m">温度 0.4</span>','<span class="m">gemini-2.5-pro</span>',chip('文本 ✓','ok')],
          ['写亮点','只写标题没覆盖的','<span class="m">claude-sonnet-5</span>','<span class="m">温度 0.4</span>','<span class="m">gemini-2.5-pro</span>',chip('文本 ✓','ok')],
          ['写五点','五条各讲不同的事','<span class="m">claude-sonnet-5</span>','<span class="m">温度 0.5</span>','<span class="m">gemini-2.5-pro</span>',chip('文本 ✓','ok')],
          ['写后台词','补前台的缺口','<span class="m">gemini-2.5-flash</span>','<span class="m">温度 0.2</span>','<span class="m">—</span>',chip('文本 ✓','ok')],
          ['反向理解复核','只看成品反推理解','<span class="m">gemini-2.5-pro</span>','<span class="m">温度 0</span>','<span class="m">gemini-2.5-flash</span>',chip('异厂 ✓','sys')],
        ]
      ), {flush:true}) +

      panel('版本与影响', kv([
        ['当前版本','MDL-v3'],
        ['生效时间','2026-08-18 09:00'],
        ['上一版','MDL-v2（可退回）'],
        ['这次改了什么','写作三环节从 Gemini 换成 Claude'],
        ['已用于','4 条任务'],
        ['回测','还没做'],
      ]) +
      '<div style="margin-top:14px">'+callout('warn','换模型等于换了写作者',
        '这周的通过率不能和上周直接比（在「效果统计」页也有同样的提醒）。<b>建议先跑回测再设为默认。</b>')+'</div>' +
      '<div class="btnrow" style="margin-top:10px">'+btn('跑回测','btn')+btn('退回 MDL-v2','btn--danger')+'</div>') +
    '</div>' +

    panel('硬性限制：复核不能和写作用同一家', '<div class="form g2">'+
      fld('写作环节所用服务商', txt('云雾 API（claude-sonnet-5）', true)) +
      fld('复核环节所用服务商', txt('Gemini 官方（gemini-2.5-pro）', true)) +
      fld('校验结果', txt('通过 —— 两者不同家', true)) +
      fld('如果改成同一家会怎样', txt('拒绝保存，并提示原因', true)) +
    '</div>' +
    '<div style="margin-top:14px">' +
    callout('stop','为什么要做成硬约束而不是提醒',
      '「反向理解复核」的全部意义在于：<b>换一个独立的脑子，只看最终文案，反推它读懂了什么</b>。<br>' +
      '如果复核用的是写作那家的模型，它会带着相同的偏好和盲区——<b>写的人自己检查自己，等于没检查</b>。<br>' +
      '所以这不是"最好别这样"，而是<b>系统直接拒绝保存</b>：选了同一家服务商，保存按钮会报错并说明原因。备用模型链也一并校验。') +
    '</div>', {sub:'保存时校验，冲突即拒绝',
      note:'例外情况：如果你只配置了一家服务商，系统会<b>阻止你启用复核环节</b>并提示「至少需要两家服务商才能做独立复核」，而不是降级放行。'});
  }
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
    return callout('','这一页是整个"越用越好"的起点',
      '不登记 ASIN，后面三页（真实表现、预期对比、优化建议）就全是空的。<b>只花几秒钟，但它决定了系统能不能积累经验。</b>') +
    table(['商品/站点','文案版本','ASIN','上线日期','当初假设的主入口','用的哪版设置','跟踪状态'],[
      ['FX-01 / 美国','<span class="m">v2</span>','<span class="m">B0G2M1DCS3</span>','2026-08-06','花卉装饰 + 尺寸筛选','<span class="m">P-v2/PR-v5/MDL-v1</span>',chip('已跟踪 2 周','ok')],
      ['FX-01 / 英国','<span class="m">v2</span>','<span class="m">B0G2M2NHKZ</span>','2026-08-06','花卉装饰','<span class="m">P-v2/PR-v5/MDL-v1</span>',chip('已跟踪 2 周','ok')],
      ['FX-03 / 美国','<span class="m">v1</span>','<span class="m dim">还没填</span>','—','—','<span class="m">P-v4/PR-v7/MDL-v3</span>',chip('等你登记','warn')],
    ]);
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
    return table(['ASIN','站点','周次','入口类型','曝光','点击率','转化率','成交单数','广告成本占比','是不是探索词'],[
      ['<span class="m">B0G2M1DCS3</span>','美国','W33','花卉装饰','<span class="num">12,408</span>','<span class="num">0.71%</span>','<span class="num">4.1%</span>','<span class="num">18</span>','<span class="num">22.4%</span>',chip('否','neutral')],
      ['<span class="m">B0G2M1DCS3</span>','美国','W33','尺寸筛选','<span class="num">6,120</span>','<span class="num">0.94%</span>','<span class="num">5.6%</span>','<span class="num">14</span>','<span class="num">17.1%</span>',chip('否','neutral')],
      ['<span class="m">B0G2M1DCS3</span>','美国','W33','沙发场景','<span class="num">318</span>','<span class="num">0.42%</span>','<span class="num">2.2%</span>','<span class="num">1</span>','<span class="num">48.0%</span>',chip('是','sys')],
    ]) +
    callout('warn','看第三行别急着砍',
      '沙发场景这一路曝光只有 318、广告成本占比 48%，<b>看着很差</b>。但它被标为探索词——样本太少，用成熟词的标准衡量会直接杀掉一个可能的新入口。');
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
  body:function(){
    return table(['商品/站点','当初假设的第一入口','实际的第一入口','假设成立吗','怎么解释','建议'],[
      ['<span class="m">B0G2M1DCS3</span> / 美国','花卉装饰','尺寸筛选',chip('部分成立','warn'),'买家先按尺寸筛，再看图案','把"尺寸"在类目优先级里往前提'],
      ['<span class="m">B0G2M2NHKZ</span> / 英国','花卉装饰','花卉装饰',chip('成立','ok'),'—','相关词升级为"已验证有效"'],
    ]);
  }
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
  body:function(){
    return panel('回测：新参数 P-v5 对比现行 P-v4', table(
      ['指标','现在（P-v4）','新的（P-v5）','变化','结论'],
      [
        ['一次通过率','<span class="num">83.6%</span>','<span class="num">86.2%</span>','<span class="num">+2.6 个百分点</span>',chip('更好','ok')],
        ['亮点没新内容','<span class="num">3 条</span>','<span class="num">1 条</span>','<span class="num">−2</span>',chip('更好','ok')],
        ['标题没词可用','<span class="num">4 条</span>','<span class="num">6 条</span>','<span class="num">+2</span>',chip('更差','fail')],
        ['最重要机会覆盖率','<span class="num">100%</span>','<span class="num">100%</span>','<span class="num">持平</span>',chip('一样','neutral')],
        ['平均消耗','<span class="num">148 K</span>','<span class="num">151 K</span>','<span class="num">+2%</span>',chip('可接受','neutral')],
      ]
    ), {flush:true, note:'<b>有变好也有变坏，所以不给"综合评分"</b>。需要你判断：多放行 2 条 vs 多 2 条标题没词可用，哪个代价更大。这种判断系统不替你做。'}) +
    '<div class="btnrow">'+btn('采纳并发布 P-v5','btn')+btn('放弃这个提案')+btn('扩大样本再跑一次')+'</div>';
  }
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
    return toolbar([sel('全部角色',['运营','审核','管理员'])],[btn('新增用户','btn')]) +
    table(['用户','角色','受限管理员','负责站点','最后登录','状态',''],[
      ['<span class="m">Oldcat</span>',chip('管理员','sys'),chip('否 · 完整权限','neutral'),'全部','<span class="m">8-18 09:02</span>',chip('启用','ok'),btn('编辑')],
      ['<span class="m">运营A</span>',chip('运营','run'),'—','美国, 英国','<span class="m">8-18 08:41</span>',chip('启用','ok'),btn('编辑')],
      ['<span class="m">Lita</span>',chip('审核','run'),'—','美国, 英国','<span class="m">8-17 18:12</span>',chip('启用','ok'),btn('编辑')],
      ['<span class="m">数据C</span>',chip('管理员','sys'),chip('是 · 碰不到密钥/用户','warn'),'全部','<span class="m">8-16 14:00</span>',chip('启用','ok'),btn('编辑')],
    ]) +
    callout('warn','合并角色带来的一个副作用，用这个开关补上',
      '原来的「数据维护」角色已并入管理员，所以数据岗<b>默认会拿到改模型密钥和改用户权限的能力</b>。<br>' +
      '如果这两个岗不是同一个人，把他设成<b>受限管理员</b>：数据导入、类目/站点规则照常能改，但 <b>AI 模型与密钥</b>、<b>用户与权限</b> 两页对他关闭。<br>' +
      '上表里「数据C」就是这样配的。');
  }
});

page('adm-perm', {
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
    return panel('权限说明', table(
      ['能做什么','运营','审核','管理员','受限管理员','AI','系统代码'],
      [
        ['提交生成任务','可以','可以','可以','可以','—','—'],
        ['改商品资料','可以','可以','可以','可以',chip('禁止','fail'),chip('禁止','fail')],
        ['导入站点数据','—','—','可以','可以',chip('禁止','fail'),'只读'],
        ['标记"可以上架"',chip('禁止','fail'),chip('禁止','fail'),chip('禁止','fail'),chip('禁止','fail'),chip('禁止','fail'),chip('唯一判定方','sys')],
        ['人工改判选词','禁止','可以 · 记台账','可以','可以',chip('禁止','fail'),'判定方'],
        ['改类目/站点规则','禁止','禁止','可以 · 生成新版本','可以 · 生成新版本','禁止','只读'],
        ['改 AI 模型与密钥','禁止','禁止','可以',chip('禁止','fail'),'禁止','只读'],
        ['改用户与权限','禁止','禁止','可以',chip('禁止','fail'),'禁止','—'],
        ['复核平台规则','禁止','禁止','可以 · 需存档','可以 · 需存档','禁止','只读'],
        ['触发失败重做','可以 · 仅失败字段','可以','可以','可以','只能建议','执行'],
        ['自己证明"数据读全了/字数够了/词选完了"','—','—','—','—',chip('绝对禁止','fail'),chip('唯一判定方','sys')],
      ]
    ), {flush:true, note:'<b>「标记可以上架」整行没有任何人能做</b>。这一行是这套系统最特别的地方，也是审计可信度的根 —— 如果谁都能手动打开，那五项检查就没意义了。'});
  }
});

page('adm-db', {
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
  body:function(){
    return stats([
      ['数据库大小','4.2 GB','',' ',true],
      ['关键词行数','128 万','占 71%','',true],
      ['最近备份','8-18 03:00','自动导出到云盘','ok',true],
      ['最近恢复演练','7-30','已过 19 天，建议再做一次','warn',true],
    ],4) +
    '<div class="cols c2">' +
      panel('各表占用', table(['表','行数','体积','能不能清'],[
        ['关键词原始数据','<span class="num">1,283,410</span>','<span class="num">2.98 GB</span>','可归档 4 个旧快照'],
        ['选词记录','<span class="num">142,038</span>','<span class="num">610 MB</span>','不能（审计产物）'],
        ['机会清单','<span class="num">88,412</span>','<span class="num">301 MB</span>','不能'],
        ['周表现数据','<span class="num">4,102</span>','<span class="num">18 MB</span>','不能'],
        ['操作记录','<span class="num">61,204</span>','<span class="num">92 MB</span>','超过 180 天的可归档'],
      ]), {flush:true}) +
      panel('一致性巡检', table(['检查什么','结果'],[
        ['有没有"去向为空"的候选词',chip('0 · 数据库约束兜住了','ok')],
        ['有没有搜索排名写成 0 的',chip('0 · 数据库约束兜住了','ok')],
        ['有没有缺版本信息的任务',chip('0','ok')],
        ['有没有被引用却标了删除的快照',chip('0','ok')],
        ['有没有文案缺检查报告的',chip('0','ok')],
        ['有没有孤儿数据',chip('0','ok')],
      ]), {flush:true, note:'<b>全 0 是应该的</b>——这些本来就该被数据库约束挡住。巡检出非 0，说明约束漏了一处，要立刻查。'}) +
    '</div>' +
    '<div class="btnrow">'+btn('立即备份','btn')+btn('归档旧快照')+btn('跑一致性巡检')+btn('做一次恢复演练','btn--danger')+'</div>';
  }
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
    return toolbar([inp('搜索对象/用户'), sel('全部动作',['改设置','人工改判','轮换密钥','复核规则','导入数据','放行'])],[btn('导出')]) +
    table(['时间','谁','做了什么','对象','改动前 → 后'],[
      ['<span class="m">8-18 09:00</span>','Oldcat','发布模型新版本','<span class="m">MDL-v2 → MDL-v3</span>','写作三环节换成 claude-sonnet-5'],
      ['<span class="m">8-17 16:22</span>','Lita','人工改判','<span class="m">FX-01/英国 · cushion covers</span>','被拒绝 → 进标题'],
      ['<span class="m">8-17 14:10</span>','Oldcat','复核平台规则','<span class="m">美国 2026-08 版</span>','存档官方页面'],
      ['<span class="m">8-16 14:02</span>','数据C','导入数据','<span class="m">IMP-0041 · 美国搜索表现</span>','3,842 行'],
      ['<span class="m">8-16 10:31</span>','Oldcat','发布 AI 指令新版本','<span class="m">PR-v6 → PR-v7</span>','标题准入要求写清挤掉了谁'],
    ]);
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
  body:function(){
    return table(['环境','n8n 实例','用途','连通','工作流数','规矩'],[
      ['开发','<span class="m">oldcat.zeabur.app</span>','全部开发与首次验证',chip('正常','ok'),'<span class="num">11</span>','所有改动先落这里'],
      ['镜像','<span class="m">littlecat.zeabur.app</span>','回归对照 / 灾备',chip('正常','ok'),'<span class="num">0</span>','只同步已验证的版本'],
      ['客户生产','<span class="m">lita.zeabur.app</span>','客户日常使用',chip('还没接入','neutral'),'<span class="num">0</span>',chip('未验证禁止上','fail')],
    ]) +
    panel('AI 网关（已定方案）', kv([
      ['入口','POST /api/llm/invoke'],
      ['谁在调','n8n 的全部 AI 节点（不直连模型商）'],
      ['谁拿着密钥','本系统（加密存储，永不下发）'],
      ['按什么解析','当前模型版本 + 各环节绑定'],
      ['超时 / 重试','按服务商配置 · 失败走绑定的备用模型'],
      ['记账','每次调用都记 → 用量与费用页'],
      ['降级留痕','用了备用模型必须写进检查报告'],
    ]), {sub:'密钥永远不会进入 n8n 的执行记录',
      note:'<b>代价要认</b>：网关成了关键环节，它挂了所有生成都跑不动。所以必须有健康检查和<b>明确失败</b>（不允许悄悄卡住），并纳入监控项。'}) +
    '<div class="cols c2">' +
      panel('n8n 怎么被触发', kv([
        ['触发方式','webhook（发完即走）'],
        ['返回模式','收到即返回，不等结果'],
        ['怎么知道进度','本系统轮询数据库里的任务状态'],
        ['取消怎么做','改状态标记，流程下一步自检退出'],
      ])) +
      panel('告警渠道', table(['渠道','用来通知什么','状态'],[
        ['飞书机器人','任务失败 / 规则超期 / 额度告警 / 网关异常',chip('启用','ok')],
        ['邮件','—',chip('停用','neutral')],
      ]), {flush:true}) +
    '</div>';
  }
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
  body:function(){
    return stats([
      ['本月用量','8.4 M','护栏 20 M','ok',true],
      ['本月调用次数','3,182','',' ',true],
      ['每条商品均价','约 $0.42','目标 $0.60 以内','ok',true],
      ['今日队列消耗','412 K','上限 2 M','ok',true],
    ],4) +
    panel('按环节看花在哪', table(['环节','用的模型','调用次数','用量','占比','平均耗时'],[
      ['写五点','claude-sonnet-5','<span class="num">418</span>','<span class="num">2.61 M</span>','<span class="num">31%</span>','<span class="num">24.1 秒</span>'],
      ['给词分类','gemini-2.5-flash','<span class="num">2,104</span>','<span class="num">2.02 M</span>','<span class="num">24%</span>','<span class="num">3.8 秒</span>'],
      ['理关系','gemini-2.5-pro','<span class="num">418</span>','<span class="num">1.51 M</span>','<span class="num">18%</span>','<span class="num">11.2 秒</span>'],
      ['写标题','claude-sonnet-5','<span class="num">431</span>','<span class="num">0.92 M</span>','<span class="num">11%</span>','<span class="num">9.4 秒</span>'],
      ['反向理解复核','gemini-2.5-pro','<span class="num">418</span>','<span class="num">0.78 M</span>','<span class="num">9%</span>','<span class="num">8.1 秒</span>'],
      ['其他环节','—','<span class="num">—</span>','<span class="num">0.56 M</span>','<span class="num">7%</span>','—'],
    ]), {flush:true, note:'想省钱先看占比最高的「写五点」。但要注意：<b>换便宜模型等于换写作者</b>，省下的钱可能以质量下降为代价，改之前先跑回测。'});
  }
});
