// ─────────────────────────────────────────────────────────
// app.js  —  食宜 ShiYi
// 要改 Prompt？         → buildPrompt()
// 要改结果展示？        → renderResult()
// 要改备用推荐内容？    → getFallbackResult()
// 要改历史记录逻辑？    → saveToHistory() / renderHistory()
// ─────────────────────────────────────────────────────────

// ══ 状态 ══════════════════════════════════════════════════
let profile    = JSON.parse(localStorage.getItem('shiyi_profile') || '{}');
let lang       = localStorage.getItem('shiyi_lang') || 'zh';
let todayState = {};
let lastResult = '';
let currentHistoryTab = 'all';
let openDetailId = null;  // 当前打开的历史详情 id

// ══ 语言 ══════════════════════════════════════════════════
const STRINGS = {
  zh: {
    'profile-title':'建立你的档案','profile-sub':'只需填写一次，之后每天自动调用',
    'identity-label':'你的名字和头像','name-hint':'会显示在每日推荐上',
    'constitution-label':'选择你的中医体质',
    'protein-label':'喜欢的蛋白质（可多选）','restrict-label':'不吃的东西（可多选）',
    'time-label':'做饭时间','save-profile':'保存档案，开始今日推荐 →',
    'checkin-title':'今日状态','checkin-sub':'今天胃口怎么样？',
    'appetite-label':'今日胃口','generate-btn':'✦ 生成今晚推荐',
    'loading-text':'正在为你生成专属菜单…','loading-sub':'结合体质 · 节气 · 今日状态综合分析',
    'result-title':'今晚推荐','copy-btn':'📋 复制菜单','back-btn':'← 重新生成',
    'history-title':'历史菜单','history-sub':'点击 ♡ 收藏喜欢的菜单',
    'tab-all':'全部','tab-fav':'已收藏 ♡','history-empty':'还没有记录，去生成第一份菜单吧',
    'history-back':'← 返回','settings-title':'⚙ 设置','save-settings':'关闭',
    'edit-profile':'修改档案','langBtn':'EN',
  },
  en: {
    'profile-title':'Set Up Your Profile','profile-sub':'One-time setup, used every day automatically',
    'identity-label':'Your Name & Avatar','name-hint':'Shows on your daily recommendation',
    'constitution-label':'Select Your TCM Constitution',
    'protein-label':'Preferred Proteins (multi-select)','restrict-label':'Dietary Restrictions (multi-select)',
    'time-label':'Cooking Time','save-profile':"Save Profile & Start →",
    'checkin-title':"Today's Status",'checkin-sub':'How is your appetite today?',
    'appetite-label':'Appetite Today','generate-btn':"✦ Generate Tonight's Recommendation",
    'loading-text':'Generating your personalized menu…','loading-sub':'Analyzing constitution · solar term · state',
    'result-title':"Tonight's Recommendation",'copy-btn':'📋 Copy Menu','back-btn':'← Regenerate',
    'history-title':'Menu History','history-sub':'Tap ♡ to save favorites',
    'tab-all':'All','tab-fav':'Saved ♡','history-empty':'No history yet — generate your first menu!',
    'history-back':'← Back','settings-title':'⚙ Settings','save-settings':'Close',
    'edit-profile':'Edit Profile','langBtn':'中文',
  }
};

const EMOJI_LABELS = {
  zh: { 1:'没什么胃口', 2:'一般般', 3:'还可以', 4:'挺想吃的', 5:'超有胃口！' },
  en: { 1:'No appetite', 2:'Not much', 3:'Okay', 4:'Pretty hungry', 5:'Very hungry!' }
};

const TIME_VALS   = ['15', '30', '60', 'takeout'];
const TIME_LABELS = { zh:['15分钟','30分钟','1小时','点外卖'], en:['15 min','30 min','1 hour','Takeaway'] };

function applyLang() {
  const s = STRINGS[lang];
  for (const [k, v] of Object.entries(s)) {
    const el = document.getElementById('t-' + k);
    if (el) el.textContent = v;
  }
  document.documentElement.setAttribute('data-lang', lang);
  // 更新时间滑块刻度
  const ticks = document.querySelectorAll('.time-ticks span');
  const labels = TIME_LABELS[lang];
  ticks.forEach((t, i) => { if (labels[i]) t.textContent = labels[i]; });
  // 更新 emoji label
  updateEmojiLabel();
}

function toggleLang() {
  lang = lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('shiyi_lang', lang);
  applyLang();
}

// ══ 导航 ══════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'historyScreen') renderHistory();
}

// ══ 头像 ══════════════════════════════════════════════════
function handleAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const b64 = e.target.result;
    document.getElementById('avatarPreview').src = b64;
    document.getElementById('avatarPreview').style.display = 'block';
    document.getElementById('avatarPlaceholder').style.display = 'none';
    profile._avatarTemp = b64;
  };
  reader.readAsDataURL(file);
}

// ══ 档案表单 ══════════════════════════════════════════════
function selectConstitution(el) {
  document.querySelectorAll('.constitution-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function toggleCheck(el) {
  el.classList.toggle('selected');
  el.querySelector('.check-box').textContent = el.classList.contains('selected') ? '✓' : '';
}

// 时间滑块
function updateTimeSlider(input) {
  const idx = parseInt(input.value);
  const labels = TIME_LABELS[lang];
  document.getElementById('timeDisplay').textContent = labels[idx];
}

// Emoji 胃口选择
function selectEmoji(el) {
  document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  updateEmojiLabel();
}

function updateEmojiLabel() {
  const sel = document.querySelector('.emoji-opt.selected');
  const labelEl = document.getElementById('emojiLabel');
  if (!labelEl) return;
  if (sel) {
    labelEl.textContent = EMOJI_LABELS[lang][sel.dataset.val] || '';
  } else {
    labelEl.textContent = lang === 'zh' ? '点击选择今日胃口' : 'Tap to select your appetite';
  }
}

function saveProfile() {
  const constitution = document.querySelector('.constitution-card.selected')?.dataset.val;
  if (!constitution) {
    showError('profileError', lang === 'zh' ? '请先选择体质' : 'Please select a constitution first');
    return;
  }
  const name         = document.getElementById('userName').value.trim();
  const avatar       = profile._avatarTemp || profile.avatar || '';
  const proteins     = [...document.querySelectorAll('#proteinChecks .check-item.selected')].map(e => e.textContent.trim());
  const restrictions = [...document.querySelectorAll('#restrictChecks .check-item.selected')].map(e => e.textContent.trim());
  const customR      = document.getElementById('customRestrict').value;
  const timeIdx      = parseInt(document.getElementById('timeSlider').value);
  const cookTime     = TIME_VALS[timeIdx];

  profile = { constitution, name, avatar, proteins, restrictions, customRestrict: customR, cookTime };
  localStorage.setItem('shiyi_profile', JSON.stringify(profile));
  hideError('profileError');
  updateBadge();
  showScreen('checkinScreen');
}

function updateBadge() {
  const constName = CONSTITUTION_NAMES[profile.constitution] || '-';
  const displayName = profile.name
    ? `${profile.name} · ${constName}`
    : constName;
  const el = document.getElementById('badgeName');
  if (el) el.textContent = displayName;

  // 头像
  const badgeAvatar = document.getElementById('badgeAvatar');
  if (badgeAvatar) {
    if (profile.avatar) {
      badgeAvatar.innerHTML = `<img src="${profile.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      badgeAvatar.textContent = '🏮';
    }
  }
}

// ══ 节气 ══════════════════════════════════════════════════
function getSolarTerm() {
  const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
  const terms = [
    [1,6,"小寒"],[1,20,"大寒"],[2,4,"立春"],[2,19,"雨水"],
    [3,6,"惊蛰"],[3,21,"春分"],[4,5,"清明"],[4,20,"谷雨"],
    [5,6,"立夏"],[5,21,"小满"],[6,6,"芒种"],[6,21,"夏至"],
    [7,7,"小暑"],[7,23,"大暑"],[8,7,"立秋"],[8,23,"处暑"],
    [9,8,"白露"],[9,23,"秋分"],[10,8,"寒露"],[10,23,"霜降"],
    [11,7,"立冬"],[11,22,"小雪"],[12,7,"大雪"],[12,22,"冬至"]
  ];
  let best = "春分";
  for (const [tm, td, tn] of terms) {
    if (m > tm || (m === tm && day >= td)) best = tn;
  }
  return best;
}

// ══ 食材筛选 ══════════════════════════════════════════════
function getRelevantIngredients(constitution, state) {
  const rules = CONSTITUTION_RULES[constitution] || CONSTITUTION_RULES.balanced;
  let candidates = INGREDIENTS.filter(i => i.cl <= rules.cl && i.ht <= rules.ht && i.dm <= rules.dm);
  if (state.appetite <= 2) candidates = candidates.filter(i => i.ol <= 1 && i.dm <= 1);
  const byCategory = {};
  candidates.forEach(i => { if (!byCategory[i.c]) byCategory[i.c] = []; byCategory[i.c].push(i); });
  const result = [];
  for (const items of Object.values(byCategory)) result.push(...items.slice(0, 4));
  return result.slice(0, 40);
}

// ══ Prompt ════════════════════════════════════════════════
function buildPrompt(state) {
  const rules     = CONSTITUTION_RULES[profile.constitution] || CONSTITUTION_RULES.balanced;
  const constName = CONSTITUTION_NAMES[profile.constitution] || '平和质';
  const solarTerm = getSolarTerm();
  const ingList   = getRelevantIngredients(profile.constitution, state)
                      .map(i => `${i.n}(${i.nat}/${i.f}/${i.t})`).join('、');
  const appetiteDesc = EMOJI_LABELS[lang][state.appetite] || '一般';
  const isEn = lang === 'en';

  if (isEn) return `You are a TCM nutritionist. Generate personalized dinner recommendation as JSON only (no markdown).
User: constitution=${constName}, direction=${rules.dir}, avoid=${rules.limit}
Proteins: ${profile.proteins?.join(', ') || 'any'} | Restrictions: ${profile.restrictions?.join(', ') || 'none'}. Other: ${profile.customRestrict || 'none'}
Cooking time: ${profile.cookTime === 'takeout' ? 'takeaway' : profile.cookTime + ' min'}
Today: appetite=${appetiteDesc}, solar term=${solarTerm}
Pre-filtered ingredients: ${ingList}
IMPORTANT: Respect ALL restrictions. Output ONLY this JSON:
{"direction":"...","main":{"name":"...","ingredients":"...","recipe":"...","tcm_reason":"..."},"side":{"name":"...","ingredients":"...","recipe":"...","tcm_reason":"..."},"staple":{"name":"...","ingredients":"...","recipe":"...","tcm_reason":"..."},"soup":{"name":"...","ingredients":"...","recipe":"...","tcm_reason":"..."},"avoid":["...","...","..."],"tip":"..."}`;

  return `你是中医营养师，生成今晚个性化饮食推荐，只输出JSON，不要任何前言或markdown。
用户：体质=${constName}，推荐方向=${rules.dir}，限制=${rules.limit}
蛋白质：${profile.proteins?.join('、') || '均可'} | 禁忌：${profile.restrictions?.join('、') || '无'}；其他：${profile.customRestrict || '无'}
做饭时间：${profile.cookTime === 'takeout' ? '外卖' : profile.cookTime + '分钟'}
今日：胃口=${appetiteDesc}，节气=${solarTerm}
可用食材（已按体质预筛选）：${ingList}
严格遵守所有饮食禁忌。只输出以下JSON：
{"direction":"...","main":{"name":"...","ingredients":"...","recipe":"...","tcm_reason":"..."},"side":{"name":"...","ingredients":"...","recipe":"...","tcm_reason":"..."},"staple":{"name":"...","ingredients":"...","recipe":"...","tcm_reason":"..."},"soup":{"name":"...","ingredients":"...","recipe":"...","tcm_reason":"..."},"avoid":["...","...","..."],"tip":"..."}`;
}

// ══ API 调用 ══════════════════════════════════════════════
async function callBackend(prompt) {
  const res  = await fetch('/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.result;
}

// ══ 备用推荐 ══════════════════════════════════════════════
function getFallbackResult() {
  const c = profile.constitution || 'balanced';
  const solarTerm = getSolarTerm();
  const isEn = lang === 'en';

  const presets = {
    "yang-def": {
      zh: { direction:"温中助阳 — 以温热食材为主，驱散寒气", main:{name:"姜汁焖鸡腿",ingredients:"鸡腿、生姜、葱、酱油",recipe:"热锅下姜葱爆香，加入鸡腿翻炒，加酱油和水焖煮20分钟至熟透。",tcm_reason:"鸡肉性温补气助阳；生姜温中散寒，入脾胃经，尤其适合阳虚体质。"}, side:{name:"韭菜炒鸡蛋",ingredients:"韭菜、鸡蛋、盐",recipe:"鸡蛋打散，韭菜切段，热油快炒，加盐调味即可。",tcm_reason:"韭菜性温辛补肾阳；鸡蛋补血养阴，两者搭配温而不燥。"}, staple:{name:"小米红枣粥",ingredients:"小米、红枣、清水",recipe:"小米与红枣加水，小火煮30分钟至黏稠即成。",tcm_reason:"小米健脾和胃；红枣补气养血，为阳虚体质最宜之主食。"}, soup:{name:"姜枣红糖茶",ingredients:"生姜片、红枣、红糖",recipe:"生姜红枣加水煮15分钟，加红糖搅匀饮用。",tcm_reason:"温经通脉，驱散寒邪，益气补血。"}, avoid:["生冷食物","冰饮","寒性水果"], tip:`${solarTerm}时节，阳虚体质尤须注意保暖，饮食宜温热熟食，避免生冷。` },
      en: { direction:"Warm Yang — ginger and warming foods to dispel cold", main:{name:"Ginger Braised Chicken",ingredients:"Chicken legs, ginger, scallion, soy sauce",recipe:"Sauté ginger and scallion, add chicken, braise with soy sauce for 20 min.",tcm_reason:"Chicken is warm, tonifies Qi and Yang. Ginger disperses cold and warms the Spleen."}, side:{name:"Stir-fried Chives & Egg",ingredients:"Chinese chives, eggs, salt",recipe:"Beat eggs, stir-fry quickly with chives, season with salt.",tcm_reason:"Chives strengthen Kidney Yang; eggs nourish Blood — a classic warming pairing."}, staple:{name:"Millet & Red Date Congee",ingredients:"Millet, red dates, water",recipe:"Simmer millet and red dates for 30 min until thick.",tcm_reason:"Millet tonifies Spleen; red dates nourish Blood and Qi."}, soup:{name:"Ginger-Date Tea",ingredients:"Ginger, red dates, brown sugar",recipe:"Simmer 15 min, sweeten with brown sugar.",tcm_reason:"Warms meridians, disperses cold, nourishes Blood."}, avoid:["Cold foods","Iced drinks","Raw salads"], tip:`During ${solarTerm}, stay warm and favor cooked, warm foods.` }
    },
    "yin-def": {
      zh: { direction:"滋阴润燥 — 清蒸为主，养液生津", main:{name:"清蒸鲈鱼配香菇",ingredients:"鲈鱼、香菇、生姜、葱",recipe:"鱼身划刀，铺香菇片，蒸10-12分钟，淋酱油热油即成。",tcm_reason:"鱼肉滋阴补血；香菇润肺和胃；清蒸保留滋阴之性。"}, side:{name:"凉拌木耳黄瓜",ingredients:"木耳、黄瓜、蒜、生抽",recipe:"木耳焯水，黄瓜切片，加蒜末生抽凉拌即成。",tcm_reason:"木耳滋阴补血；黄瓜清热生津，清虚热效果显著。"}, staple:{name:"黑芝麻白米饭",ingredients:"白米、黑芝麻",recipe:"米饭蒸好后，撒上炒香的黑芝麻即可。",tcm_reason:"黑芝麻入肝肾经，滋阴润燥，阴虚体质极为适宜。"}, soup:{name:"雪梨银耳汤",ingredients:"雪梨、银耳、冰糖",recipe:"银耳泡发，与雪梨同煮30分钟，加冰糖调味。",tcm_reason:"雪梨清热润肺；银耳滋阴养颜，经典滋阴汤品。"}, avoid:["辛辣食物","煎炸食品","燥热香料"], tip:`${solarTerm}时节，阴虚体质宜早睡，避免熬夜耗阴。` },
      en: { direction:"Nourish Yin — steamed dishes to restore fluids", main:{name:"Steamed Sea Bass & Mushrooms",ingredients:"Sea bass, shiitake, ginger",recipe:"Steam fish with mushrooms for 10-12 min. Drizzle soy sauce and hot oil.",tcm_reason:"Fish nourishes Yin; mushrooms moisten the Lung. Steaming preserves Yin-nourishing properties."}, side:{name:"Wood Ear & Cucumber Salad",ingredients:"Wood ear, cucumber, garlic, soy sauce",recipe:"Blanch wood ear, slice cucumber, toss with garlic dressing.",tcm_reason:"Wood ear nourishes Yin; cucumber cools and hydrates."}, staple:{name:"Rice with Black Sesame",ingredients:"White rice, black sesame",recipe:"Cook rice, sprinkle toasted sesame on top.",tcm_reason:"Black sesame nourishes Liver and Kidney Yin."}, soup:{name:"Pear & Snow Fungus Soup",ingredients:"Pear, snow fungus, rock sugar",recipe:"Simmer 30 min, sweeten with rock sugar.",tcm_reason:"Pear clears heat; snow fungus nourishes Yin."}, avoid:["Spicy foods","Fried foods","Warming spices"], tip:`During ${solarTerm}, sleep early — staying up depletes Yin.` }
    }
  };

  const preset = presets[c];
  if (preset) return isEn ? preset.en : preset.zh;

  return isEn ? {
    direction:"Balanced nourishment aligned with the season",
    main:{name:"Steamed Chicken & Vegetables",ingredients:"Chicken breast, seasonal vegetables, ginger",recipe:"Steam chicken with ginger and vegetables for 15-20 min.",tcm_reason:"Chicken tonifies Qi. Steaming preserves nutrients."},
    side:{name:"Stir-fried Seasonal Greens",ingredients:"Seasonal vegetables, garlic, salt",recipe:"Stir-fry greens with garlic over high heat for 2-3 min.",tcm_reason:"Seasonal vegetables support natural balance."},
    staple:{name:"Steamed Rice",ingredients:"White rice",recipe:"Rinse and steam normally.",tcm_reason:"Rice is neutral and sweet, tonifying Spleen and Stomach."},
    soup:{name:"Light Vegetable Soup",ingredients:"Mixed vegetables, stock",recipe:"Simmer vegetables for 15 min.",tcm_reason:"Warm soup aids digestion and hydration."},
    avoid:["Fried foods","Excessive sugar","Processed foods"],
    tip:`During ${solarTerm}, eat in harmony with the season.`
  } : {
    direction:"应时而食，平和调养",
    main:{name:"清蒸鸡胸肉配时蔬",ingredients:"鸡胸肉、时令蔬菜、生姜",recipe:"鸡胸肉切片，与时蔬、姜片同蒸15-20分钟，淡酱油调味。",tcm_reason:"鸡肉补气；清蒸保留营养，适合大多数体质。"},
    side:{name:"炒时令绿蔬",ingredients:"时令蔬菜、大蒜、盐",recipe:"热锅爆香蒜末，下蔬菜大火翻炒2-3分钟，加盐即成。",tcm_reason:"应季蔬菜顺应自然节律，有助维持机体平衡。"},
    staple:{name:"蒸米饭",ingredients:"大米",recipe:"淘米蒸熟即可。",tcm_reason:"大米性平甘淡，健脾和胃，为均衡饮食之基础。"},
    soup:{name:"清蔬汤",ingredients:"时蔬、清汤",recipe:"时蔬加清汤煮15分钟即成。",tcm_reason:"温热清汤助消化，补充水分。"},
    avoid:["油炸食品","过度甜食","加工食品"],
    tip:`${solarTerm}时节，顺应四时饮食，以温热熟食为主。`
  };
}

// ══ 生成推荐 ══════════════════════════════════════════════
async function generateRecommendation() {
  const emojiSel = document.querySelector('.emoji-opt.selected');
  if (!emojiSel) {
    showError('checkinError', lang === 'zh' ? '请先选择今日胃口' : 'Please select your appetite first');
    return;
  }
  hideError('checkinError');
  todayState = { appetite: parseInt(emojiSel.dataset.val) };
  showScreen('loadingScreen');

  let result;
  try {
    const raw     = await callBackend(buildPrompt(todayState));
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    result = JSON.parse(cleaned);
  } catch (err) {
    if (err.message === 'NO_KEY') {
      result = getFallbackResult();
    } else {
      console.error('API error:', err.message);
      result = getFallbackResult();
      showToast(lang === 'zh'
        ? `AI 生成失败，已使用内置推荐 (${err.message})`
        : `AI error, using built-in result`, 4000);
    }
  }

  saveToHistory(result);
  renderResult(result);
  showScreen('resultScreen');
}

// ══ 渲染结果 ══════════════════════════════════════════════
function renderResult(r) {
  const isEn      = lang === 'en';
  const solarTerm = getSolarTerm();
  const constName = CONSTITUTION_NAMES[profile.constitution] || '';
  const nameStr   = profile.name ? `${profile.name} · ` : '';
  const dateStr   = new Date().toLocaleDateString(isEn ? 'en-US' : 'zh-CN', { month:'long', day:'numeric', weekday:'short' });

  document.getElementById('t-result-sub').textContent = isEn
    ? `${nameStr}${dateStr} · ${solarTerm} · ${constName}`
    : `${nameStr}${dateStr} · 节气：${solarTerm} · ${constName}`;

  const labels = isEn
    ? { main:'Main Dish', side:'Side Dish', staple:'Staple', soup:'Soup / Drink', avoid:'Avoid Today', tip:"Today's Tip" }
    : { main:'主菜', side:'配菜', staple:'主食', soup:'汤或饮品', avoid:'今天尽量少吃', tip:'小提示' };

  document.getElementById('resultContent').innerHTML = buildResultHTML(r, labels, isEn, solarTerm, dateStr);
  lastResult = buildCopyText(r, labels, solarTerm);
}

function buildResultHTML(r, labels, isEn, solarTerm, dateStr) {
  let html = `<div class="result-header"><div class="direction">${r.direction}</div><div class="date-info">${dateStr} &nbsp;·&nbsp; ${isEn?'Solar Term':'节气'}：${solarTerm}</div></div>`;
  const courses = [
    { key:'main',   label:labels.main,   tagClass:'' },
    { key:'side',   label:labels.side,   tagClass:'jade' },
    { key:'staple', label:labels.staple, tagClass:'gold' },
    { key:'soup',   label:labels.soup,   tagClass:'jade' },
  ];
  for (const { key, label, tagClass } of courses) {
    const d = r[key];
    if (!d) continue;
    html += `<div class="dish-block"><div class="dish-block-header"><div class="dish-tag ${tagClass}">${label}</div><div class="dish-name">${d.name}</div></div><div class="dish-body"><div class="dish-ingredients">${isEn?'Ingredients':'食材'}：${d.ingredients}</div><div class="dish-recipe">${isEn?'Method':'做法'}：${d.recipe}</div><div class="dish-reason">🌿 ${d.tcm_reason}</div></div></div>`;
  }
  if (r.avoid?.length) {
    html += `<div class="avoid-block"><div class="avoid-title">⚠ ${labels.avoid}</div><div class="avoid-tags">${r.avoid.map(a=>`<span class="avoid-tag">${a}</span>`).join('')}</div></div>`;
  }
  if (r.tip) {
    html += `<div class="tip-block"><div class="tip-title">💡 ${labels.tip}</div><div class="tip-text">${r.tip}</div></div>`;
  }
  return html;
}

function buildCopyText(r, labels, solarTerm) {
  const isEn = lang === 'en';
  let txt = isEn
    ? `🍲 ShiYi TCM Meal Recommendation\n${new Date().toLocaleDateString()} · Solar Term: ${solarTerm}\n\n`
    : `🍲 食宜中医饮食推荐\n${new Date().toLocaleDateString()} · 节气：${solarTerm}\n\n`;
  txt += r.direction + '\n\n';
  for (const [key, label] of Object.entries(labels)) {
    if (['avoid','tip'].includes(key)) continue;
    if (r[key]) txt += `【${label}】${r[key].name}\n`;
  }
  if (r.avoid) txt += `\n${labels.avoid}：${r.avoid.join('、')}\n`;
  if (r.tip)   txt += `\n💡 ${r.tip}\n`;
  txt += isEn ? '\n— ShiYi TCM Meal Advisor' : '\n— 由食宜中医饮食助手生成';
  return txt;
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(lastResult);
    showToast(lang === 'zh' ? '已复制到剪贴板 📋' : 'Copied to clipboard 📋');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = lastResult; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast(lang === 'zh' ? '已复制 ✓' : 'Copied ✓');
  }
}

// ══ 历史菜单 ══════════════════════════════════════════════
function getHistory() {
  return JSON.parse(localStorage.getItem('shiyi_history') || '[]');
}
function saveHistory(list) {
  localStorage.setItem('shiyi_history', JSON.stringify(list));
}

function saveToHistory(result) {
  const history = getHistory();
  const entry = {
    id:         Date.now(),
    date:       new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }),
    timestamp:  Date.now(),
    constitution: profile.constitution,
    result:     result,
    favorited:  false,
    lang:       lang
  };
  history.unshift(entry);
  // 最多保留 50 条
  if (history.length > 50) history.splice(50);
  saveHistory(history);
}

function switchHistoryTab(btn, tab) {
  document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentHistoryTab = tab;
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  const filtered = currentHistoryTab === 'fav' ? history.filter(h => h.favorited) : history;
  const list  = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');

  if (!filtered.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = filtered.map(entry => {
    const constName = CONSTITUTION_NAMES[entry.constitution] || '';
    const dishes = [entry.result?.main?.name, entry.result?.side?.name, entry.result?.staple?.name]
                     .filter(Boolean).join(' · ');
    return `
      <div class="history-item" onclick="openDetail(${entry.id})">
        <div class="history-item-left">
          <div class="history-item-date">${entry.date} · ${constName}</div>
          <div class="history-item-direction">${entry.result?.direction || '-'}</div>
          <div class="history-item-dishes">${dishes}</div>
        </div>
        <button class="fav-btn ${entry.favorited ? 'active' : ''}"
          onclick="event.stopPropagation(); toggleFav(${entry.id}, this)">
          ${entry.favorited ? '♥' : '♡'}
        </button>
      </div>`;
  }).join('');
}

function toggleFav(id, btn) {
  const history = getHistory();
  const entry   = history.find(h => h.id === id);
  if (!entry) return;
  entry.favorited = !entry.favorited;
  saveHistory(history);
  btn.classList.toggle('active', entry.favorited);
  btn.textContent = entry.favorited ? '♥' : '♡';
  // 如果在已收藏 tab 且取消收藏，刷新列表
  if (currentHistoryTab === 'fav') renderHistory();
  // 同步详情弹层按钮
  if (openDetailId === id) {
    const detailBtn = document.getElementById('detailFavBtn');
    if (detailBtn) {
      detailBtn.classList.toggle('active', entry.favorited);
      detailBtn.textContent = entry.favorited ? '♥' : '♡';
    }
  }
}

function openDetail(id) {
  const history = getHistory();
  const entry   = history.find(h => h.id === id);
  if (!entry) return;
  openDetailId = id;

  const isEn = lang === 'en';
  const constName = CONSTITUTION_NAMES[entry.constitution] || '';
  document.getElementById('detailDate').textContent  = entry.date;
  document.getElementById('detailConst').textContent = constName;

  const favBtn = document.getElementById('detailFavBtn');
  favBtn.textContent = entry.favorited ? '♥' : '♡';
  favBtn.classList.toggle('active', entry.favorited);

  const labels = isEn
    ? { main:'Main Dish', side:'Side Dish', staple:'Staple', soup:'Soup / Drink', avoid:'Avoid', tip:'Tip' }
    : { main:'主菜', side:'配菜', staple:'主食', soup:'汤或饮品', avoid:'今天尽量少吃', tip:'小提示' };

  document.getElementById('detailContent').innerHTML =
    buildResultHTML(entry.result, labels, isEn, getSolarTerm(), entry.date);

  document.getElementById('historyDetailModal').classList.add('open');
}

function closeDetail() {
  document.getElementById('historyDetailModal').classList.remove('open');
  openDetailId = null;
}

function toggleFavFromDetail() {
  if (!openDetailId) return;
  const history = getHistory();
  const entry   = history.find(h => h.id === openDetailId);
  if (!entry) return;
  entry.favorited = !entry.favorited;
  saveHistory(history);
  const btn = document.getElementById('detailFavBtn');
  btn.classList.toggle('active', entry.favorited);
  btn.textContent = entry.favorited ? '♥' : '♡';
  renderHistory();
}

// ══ 设置面板 ══════════════════════════════════════════════
async function openSettings() {
  document.getElementById('settingsModal').classList.add('open');
  try {
    const res  = await fetch('/api/status');
    const data = await res.json();
    const el   = document.getElementById('apiStatus');
    el.className = data.hasKey ? 'api-status ok' : 'api-status off';
    el.textContent = data.hasKey
      ? (lang === 'zh' ? `✓ API Key 已配置 · 模型：${data.model}` : `✓ API Key configured · Model: ${data.model}`)
      : (lang === 'zh' ? '✗ 未配置 API Key，当前使用内置推荐' : '✗ No API Key — using built-in recommendations');
  } catch { /* ignore */ }
}
function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
}

// ══ 工具 ══════════════════════════════════════════════════
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (msg) el.textContent = msg;
  el.classList.add('show');
}
function hideError(id) { document.getElementById(id)?.classList.remove('show'); }
function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ══ 初始化 ════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  applyLang();

  if (profile.constitution) {
    // 恢复档案
    document.querySelector(`.constitution-card[data-val="${profile.constitution}"]`)?.classList.add('selected');
    if (profile.cookTime) {
      const idx = TIME_VALS.indexOf(profile.cookTime);
      if (idx >= 0) {
        document.getElementById('timeSlider').value = idx;
        updateTimeSlider(document.getElementById('timeSlider'));
      }
    }
    if (profile.customRestrict) document.getElementById('customRestrict').value = profile.customRestrict;
    if (profile.name) document.getElementById('userName').value = profile.name;
    if (profile.avatar) {
      document.getElementById('avatarPreview').src = profile.avatar;
      document.getElementById('avatarPreview').style.display = 'block';
      document.getElementById('avatarPlaceholder').style.display = 'none';
    }
    updateBadge();
    showScreen('checkinScreen');
  }

  // 点弹层背景关闭
  document.getElementById('historyDetailModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetail();
  });
  document.getElementById('settingsModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeSettings();
  });
});
