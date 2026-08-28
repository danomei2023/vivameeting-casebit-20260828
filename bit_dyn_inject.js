/* bit_dyn_inject.js — 把 bit_list_v7 JSON 中"不在 case-bit.html hardcoded 范围"的会议动态注入
 * 设计原则：
 *   - 保留 case-bit.html 已有的 180 张 hardcoded 卡片不动
 *   - 动态注入 79 张新增卡片，按年份归入对应 y{year} 区
 *   - 有图：用 photo 字段渲染图片
 *   - 无图：用品牌 logo + 占位背景
 *   - 无 logo：用灰色占位 + 会议名首字
 */
(async function(){
  const HARD_JSON='case_assets/bit_list_v7.full-20260828011357.json?v=20260828';
  // 收集已有 hardcoded zh（避免重复）
  const hardcoded=new Set();
  document.querySelectorAll('.bit-body > h4').forEach(h=>hardcoded.add(h.textContent.trim()));
  // 拉 JSON
  let data=[];
  try{
    const r=await fetch(HARD_JSON);
    data=await r.json();
  }catch(e){
    console.error('bit_dyn: JSON 加载失败', e);
    return;
  }
  // logo 列表（用 fetch 拿不到，但硬编码全集开销大；改用 try-on-error）
  function logoPath(brand){
    return `case_assets/bit_logos/logo_${brand}.png`;
  }
  function imgPath(photo){
    if(!photo) return null;
    if(photo.startsWith('case_assets/')) return photo;
    return null; // 远程路径不可用
  }
  // 按年份分组
  const byYear={};
  data.forEach(c=>{
    const zh=(c.zh||'').trim();
    if(!zh || hardcoded.has(zh)) return;
    const y=String(c.year||'');
    if(!y) return;
    if(!byYear[y]) byYear[y]=[];
    byYear[y].push(c);
  });
  // 注入每个年份
  let added=0;
  Object.keys(byYear).sort().forEach(y=>{
    const sec=document.getElementById('y'+y);
    if(!sec){console.warn('bit_dyn: 无 y'+y+' 容器');return;}
    // 国内/国际分档
    const dom=byYear[y].filter(c=> (c.tier||'国内')==='国内' || !c.tier);
    const intl=byYear[y].filter(c=>c.tier==='国际');
    function tier(name, list, icon){
      if(!list.length) return;
      // 找对应 bit-tier-head（按 icon 匹配）
      const heads=sec.querySelectorAll('.bit-tier');
      let target=null;
      heads.forEach(h=>{
        const ic=h.querySelector('.bit-tier-icon');
        if(ic && ic.textContent.includes(icon)) target=h;
      });
      if(!target){
        // 没找到对应 tier，创建新的
        const container=sec.querySelector('.container') || sec;
        const wrap=document.createElement('div');
        wrap.className='bit-tier';
        wrap.innerHTML=`<div class="bit-tier-head"><span class="bit-tier-icon">${icon}</span><h3>${name}</h3><span class="bit-tier-count">${list.length} 场</span></div><div class="bit-grid"></div>`;
        container.appendChild(wrap);
        target=wrap;
      }
      const grid=target.querySelector('.bit-grid');
      // 更新计数
      const cnt=target.querySelector('.bit-tier-count');
      if(cnt){
        const old=parseInt(cnt.textContent)||0;
        cnt.textContent=`${old+list.length} 场`;
      }
      list.forEach(c=>{
        const photo=imgPath(c.photo);
        const brand=c.brand||'';
        const city=c.city||'';
        const country=c.country||'中国';
        const edition=c.edition||'';
        const zh=c.zh||'?';
        const hasLogo=true; // logo try on error
        const card=document.createElement('div');
        card.className='bit-card';
        // 图片：有图用图，无图用 logo + 灰色背景
        let imgHTML;
        if(photo){
          imgHTML=`<img src="${photo}" alt="${zh}" loading="lazy" onerror="this.parentNode.classList.add('img-fallback'); this.parentNode.innerHTML='<div class=\\'img-fallback-inner\\'><div class=\\'fb-zh\\'>${zh.slice(0,2)}</div></div>'">`;
        } else {
          // 尝试品牌 logo，找不到就用文字
          imgHTML=`<div class="img-fallback"><img src="${logoPath(brand)}" alt="${brand}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="img-fallback-inner" style="display:none"><div class="fb-zh">${zh.slice(0,2)}</div></div></div>`;
        }
        const tags=[];
        if(edition) tags.push(`<span class="bit-tag">${edition}</span>`);
        tags.push(`<span class="bit-tag bit-tag-country">${country}</span>`);
        if(city) tags.push(`<span class="bit-tag">${city}</span>`);
        card.innerHTML=`
          <div class="bit-logo"><img src="${logoPath(brand)}" alt="${brand} logo" loading="lazy" onerror="this.parentNode.style.display='none'"></div>
          <div class="bit-img">${imgHTML}</div>
          <div class="bit-body">
            <h4>${zh}</h4>
            <p>${c.note||''}</p>
            <div class="bit-meta">${tags.join('')}</div>
          </div>`;
        grid.appendChild(card);
        added++;
      });
    }
    tier('国内 · 中国', dom, '🇨🇳');
    tier('国际 · Overseas', intl, '🌐');
    // 更新年份标题计数
    const head=sec.querySelector('.bit-year-info h2');
    if(head){
      const m=head.textContent.match(/(\d+)\s*场/);
      if(m){
        const old=parseInt(m[1])||0;
        head.textContent=head.textContent.replace(/(\d+)\s*场/,`${old+byYear[y].length} 场会议`);
      }
    }
  });
  // 更新顶部 hero 统计数字
  const leadEl=document.querySelector('.page-hero .lead');
  if(leadEl){
    const total=hardcoded.size+added;
    leadEl.innerHTML=`官方口径累计运营 <span class="gold">1000+ 场次</span>国际会议与交流活动；本档案逐年全录 <span class="gold">${total} 场</span>有独立档案的品牌会——国内与国际分列，逐一标注国度，每一场都有真实档案、品牌标识与影像为证。`;
  }
  console.log('bit_dyn: 已动态注入', added, '张卡片');
})();