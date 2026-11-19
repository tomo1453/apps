/* 場面イラスト（アニメ調SVG）
 * drawScene(phrase, category) → SVG文字列
 * - 背景と相手役は phrase.scene（場面名）で決まる
 * - 主人公の表情は phrase.mood、吹き出しの絵文字は phrase.icon
 * - phrase.image があればその画像を優先（自作イラストを使いたいとき）
 */
(() => {
  'use strict';
  const SKIN = '#FFE4D4';
  const W = 320, H = 180;

  // ---------- キャラクター ----------
  // 中心(0,0)が顔。o: { hair, hairC, outfit, outfitC, mood, glasses, cap, capC, eyeC }
  function chara(o) {
    const hc = o.hairC, oc = o.outfitC, mood = o.mood || 'smile';
    const eyeC = o.eyeC || '#6B4BA8';
    let s = '';

    // 後ろ髪
    if (o.hair === 'bob') s += `<path d="M-35,4 Q-38,-40 0,-40 Q38,-40 35,4 L35,30 Q24,36 14,30 L-14,30 Q-24,36 -35,30 Z" fill="${hc}"/>`;
    if (o.hair === 'long') s += `<path d="M-35,4 Q-38,-40 0,-40 Q38,-40 35,4 L38,58 Q20,64 0,56 Q-20,64 -38,58 Z" fill="${hc}"/>`;
    if (o.hair === 'bun') s += `<circle cx="0" cy="-40" r="13" fill="${hc}"/><path d="M-33,4 Q-36,-38 0,-38 Q36,-38 33,4 L33,18 L-33,18 Z" fill="${hc}"/>`;

    // 体
    s += `<rect x="-6" y="24" width="12" height="10" fill="${SKIN}"/>`;
    s += `<path d="M-27,74 Q-29,38 -15,31 L15,31 Q29,38 27,74 Z" fill="${oc}"/>`;
    if (o.outfit === 'suit') {
      s += `<path d="M-9,31 L0,48 L9,31 Z" fill="#fff"/><path d="M-2,36 L2,36 L3,52 L0,56 L-3,52 Z" fill="${o.tieC || '#FF5C8A'}"/>`;
      s += `<path d="M-15,31 L-3,52 L-9,74 M15,31 L3,52 L9,74" stroke="rgba(0,0,0,.18)" stroke-width="2" fill="none"/>`;
    } else if (o.outfit === 'apron') {
      s += `<path d="M-14,44 L14,44 L17,74 L-17,74 Z" fill="#fff"/><path d="M-14,44 L-10,31 M14,44 L10,31" stroke="#fff" stroke-width="3"/>`;
    } else if (o.outfit === 'uniform') {
      s += `<path d="M-9,31 L0,42 L9,31 Z" fill="#fff"/><circle cx="0" cy="50" r="2" fill="#FFD23F"/><circle cx="0" cy="60" r="2" fill="#FFD23F"/>`;
    } else {
      s += `<path d="M-12,31 Q0,42 12,31" stroke="rgba(255,255,255,.7)" stroke-width="4" fill="none"/>`;
    }

    // 顔
    s += `<circle cx="-29" cy="6" r="5" fill="${SKIN}"/><circle cx="29" cy="6" r="5" fill="${SKIN}"/>`;
    s += `<ellipse cx="0" cy="2" rx="29" ry="28" fill="${SKIN}"/>`;

    // 目
    const openEye = (x, dx = 0, dy = 0) =>
      `<ellipse cx="${x}" cy="6" rx="5.2" ry="7.2" fill="#2E2340"/>` +
      `<ellipse cx="${x + dx}" cy="${8 + dy}" rx="4" ry="4.4" fill="${eyeC}"/>` +
      `<circle cx="${x - 1.6 + dx}" cy="${3 + dy}" r="2.2" fill="#fff"/><circle cx="${x + 1.8 + dx}" cy="${9.5 + dy}" r="1" fill="#fff"/>` +
      `<path d="M${x - 7},0 Q${x},-4 ${x + 7},0" stroke="#2E2340" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    const closedEye = (x) => `<path d="M${x - 6},7 Q${x},0 ${x + 6},7" stroke="#2E2340" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    const roundEye = (x) => `<circle cx="${x}" cy="6" r="6" fill="#fff" stroke="#2E2340" stroke-width="2"/><circle cx="${x}" cy="6.5" r="2.6" fill="#2E2340"/>`;
    const xEye = (x, d) => `<path d="M${x - 5},${d ? 2 : 4} L${x + 4},6 L${x - 5},${d ? 10 : 8}" stroke="#2E2340" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="${d ? '' : `scale(-1,1) translate(${-2 * x},0)`}"/>`;

    let eyes = '', brows = '', mouth = '', extra = '';
    switch (mood) {
      case 'happy':
        eyes = closedEye(-11) + closedEye(11);
        mouth = `<path d="M-7,14 Q0,26 7,14 Z" fill="#C93F5E"/><path d="M-4,20 Q0,23 4,20" fill="#FF8FA8"/>`;
        extra = sparkle(34, -30, 6) + sparkle(-38, -22, 4);
        break;
      case 'think':
        eyes = openEye(-11, 1.2, -1.6) + openEye(11, 1.2, -1.6);
        brows = `<path d="M-16,-8 L-6,-6 M6,-7 L16,-9" stroke="#5A3E36" stroke-width="2" stroke-linecap="round"/>`;
        mouth = `<path d="M-3,17 L4,16" stroke="#9A4A50" stroke-width="2" stroke-linecap="round"/>`;
        extra = `<g fill="#B8B4CC"><circle cx="38" cy="-30" r="3"/><circle cx="46" cy="-38" r="4"/><circle cx="56" cy="-48" r="5"/></g>`;
        break;
      case 'surprised':
        eyes = roundEye(-11) + roundEye(11);
        brows = `<path d="M-17,-9 Q-11,-13 -5,-9 M5,-9 Q11,-13 17,-9" stroke="#5A3E36" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        mouth = `<ellipse cx="0" cy="18" rx="3.5" ry="4.5" fill="#C93F5E"/>`;
        extra = `<path d="M-40,-30 L-34,-22 M-44,-16 L-36,-14 M40,-30 L34,-22 M44,-16 L36,-14" stroke="#FF9F1C" stroke-width="2.5" stroke-linecap="round"/>`;
        break;
      case 'sorry':
        eyes = xEye(-11, true) + xEye(11, false);
        brows = `<path d="M-17,-6 L-6,-9 M6,-9 L17,-6" stroke="#5A3E36" stroke-width="2" stroke-linecap="round"/>`;
        mouth = `<path d="M-6,17 q2,-3 4,0 q2,3 4,0 q2,-3 4,0" stroke="#9A4A50" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        extra = drop(30, -16);
        break;
      case 'worried':
        eyes = openEye(-11, 0, 1) + openEye(11, 0, 1);
        brows = `<path d="M-17,-5 L-6,-10 M6,-10 L17,-5" stroke="#5A3E36" stroke-width="2.2" stroke-linecap="round"/>`;
        mouth = `<path d="M-5,19 Q0,14 5,19" stroke="#9A4A50" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
        extra = drop(31, -14) + `<path d="M-14,-24 l3,6 M-8,-27 l2,6" stroke="#9CB4D8" stroke-width="2" stroke-linecap="round"/>`;
        break;
      case 'confident':
        eyes = openEye(-11) + closedEye(11);
        brows = `<path d="M-17,-8 L-6,-10 M6,-10 L17,-8" stroke="#5A3E36" stroke-width="2" stroke-linecap="round"/>`;
        mouth = `<path d="M-6,14 Q1,21 7,13" stroke="#9A4A50" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
        extra = sparkle(36, -26, 7) + sparkle(44, -6, 4);
        break;
      default: // smile
        eyes = openEye(-11) + openEye(11);
        mouth = `<path d="M-5,15 Q0,20 5,15" stroke="#9A4A50" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    }
    s += eyes + brows;
    s += `<ellipse cx="-18" cy="14" rx="5" ry="3" fill="#FF8FAB" opacity=".55"/><ellipse cx="18" cy="14" rx="5" ry="3" fill="#FF8FAB" opacity=".55"/>`;
    s += mouth;

    // 前髪
    if (o.hair === 'short') {
      s += `<path d="M-31,4 Q-34,-36 0,-36 Q34,-36 31,4 Q28,-10 22,-14 L18,-6 L12,-15 L4,-6 L0,-16 L-6,-5 L-12,-15 L-18,-5 L-23,-13 Q-28,-8 -31,4 Z" fill="${hc}"/>`;
    } else {
      s += `<path d="M-32,6 Q-34,-37 0,-36 Q34,-37 32,6 Q28,-10 20,-13 Q16,-4 7,-3 Q6,-12 2,-15 Q-6,-4 -15,-2 Q-17,-11 -22,-14 Q-28,-8 -32,6 Z" fill="${hc}"/>`;
    }
    s += `<path d="M-16,-28 Q-6,-33 6,-31" stroke="rgba(255,255,255,.45)" stroke-width="3" fill="none" stroke-linecap="round"/>`;

    if (o.glasses) s += `<g stroke="#3B3355" stroke-width="1.8" fill="rgba(255,255,255,.15)"><rect x="-19" y="-1" width="15" height="13" rx="4"/><rect x="4" y="-1" width="15" height="13" rx="4"/><path d="M-4,4 L4,4"/></g>`;
    if (o.cap) s += `<path d="M-30,-18 Q-30,-44 0,-44 Q30,-44 30,-18 Z" fill="${o.capC || '#2D3E7A'}"/><rect x="-32" y="-20" width="64" height="7" rx="3" fill="${o.capC || '#2D3E7A'}"/><circle cx="0" cy="-30" r="5" fill="#FFD23F"/>`;
    s += extra;
    return s;
  }
  const sparkle = (x, y, r) => `<path d="M${x},${y - r} Q${x + r * 0.2},${y - r * 0.2} ${x + r},${y} Q${x + r * 0.2},${y + r * 0.2} ${x},${y + r} Q${x - r * 0.2},${y + r * 0.2} ${x - r},${y} Q${x - r * 0.2},${y - r * 0.2} ${x},${y - r} Z" fill="#FFD23F"/>`;
  const drop = (x, y) => `<path d="M${x},${y} Q${x + 6},${y + 9} ${x},${y + 12} Q${x - 6},${y + 9} ${x},${y} Z" fill="#8ED1FF"/>`;

  const place = (svg, x, y, s = 1, flip = false) => `<g transform="translate(${x},${y}) scale(${flip ? -s : s},${s})">${svg}</g>`;

  // ---------- 登場人物 ----------
  const HERO = {
    work: { hair: 'bob', hairC: '#5B3A2E', outfit: 'suit', outfitC: '#33467A' },
    interview: { hair: 'bob', hairC: '#5B3A2E', outfit: 'suit', outfitC: '#2B2F4A', tieC: '#4F8CFF' },
    lesson: { hair: 'bob', hairC: '#5B3A2E', outfit: 'casual', outfitC: '#FF7AB6' },
    travel: { hair: 'bob', hairC: '#5B3A2E', outfit: 'casual', outfitC: '#2EC4B6' },
  };
  const CAST = {
    colleague: { hair: 'short', hairC: '#E8B44C', outfit: 'suit', outfitC: '#4A5A8C', eyeC: '#3F8FD8', mood: 'smile', tieC: '#FFD23F' },
    client: { hair: 'short', hairC: '#3A3A48', outfit: 'suit', outfitC: '#6B6F80', eyeC: '#5B6B7A', mood: 'think', glasses: true, tieC: '#2EC4B6' },
    teacher: { hair: 'long', hairC: '#F0C35A', outfit: 'casual', outfitC: '#7BC67E', eyeC: '#3FA0D8', mood: 'smile' },
    officer: { hair: 'short', hairC: '#7A4A30', outfit: 'uniform', outfitC: '#2D3E7A', eyeC: '#4A6A8A', mood: 'smile', cap: true },
    staff: { hair: 'bun', hairC: '#2E2A3A', outfit: 'uniform', outfitC: '#D9455F', eyeC: '#8A4A6A', mood: 'happy' },
    waiter: { hair: 'short', hairC: '#C0582E', outfit: 'apron', outfitC: '#3A3A48', eyeC: '#3F8F6A', mood: 'smile' },
    passerby: { hair: 'long', hairC: '#A0522D', outfit: 'casual', outfitC: '#FFB347', eyeC: '#6A8A3F', mood: 'smile' },
    interviewer: { hair: 'bun', hairC: '#4A3A5A', outfit: 'suit', outfitC: '#3A3F5C', eyeC: '#5A4A8A', mood: 'smile', glasses: true, tieC: '#FF9F1C' },
  };

  // ---------- 背景パーツ ----------
  const rect = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
  const wall = (c, floor = '#E3D3C6') => rect(0, 0, W, H, c) + rect(0, 148, W, 32, floor);
  const table = (c = '#E9B98A') => rect(-10, 138, W + 20, 50, c) + rect(-10, 136, W + 20, 8, '#D49A66');
  const plant = (x, y) => `<rect x="${x - 9}" y="${y}" width="18" height="18" rx="3" fill="#F4A261"/><g fill="#5BBF7A"><ellipse cx="${x}" cy="${y - 10}" rx="6" ry="13"/><ellipse cx="${x - 9}" cy="${y - 4}" rx="5" ry="10" transform="rotate(-30 ${x - 9} ${y - 4})"/><ellipse cx="${x + 9}" cy="${y - 4}" rx="5" ry="10" transform="rotate(30 ${x + 9} ${y - 4})"/></g>`;
  const clock = (x, y) => `<circle cx="${x}" cy="${y}" r="13" fill="#fff" stroke="#9AA6C8" stroke-width="3"/><path d="M${x},${y - 8} L${x},${y} L${x + 6},${y + 3}" stroke="#4A4F6A" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const windowBox = (x, y, w, h, sky = '#BFE6FF') => rect(x, y, w, h, '#fff', 8) + rect(x + 5, y + 5, w - 10, h - 10, sky, 5) + `<ellipse cx="${x + w * 0.3}" cy="${y + h * 0.4}" rx="${w * 0.12}" ry="${h * 0.08}" fill="#fff"/><ellipse cx="${x + w * 0.38}" cy="${y + h * 0.36}" rx="${w * 0.09}" ry="${h * 0.08}" fill="#fff"/>`;
  const laptop = (x, y, w, h, screen) => rect(x, y, w, h, '#3B3F55', 8) + rect(x + 5, y + 5, w - 10, h - 10, screen || '#EAF2FF', 4) + `<path d="M${x - 10},${y + h} L${x + w + 10},${y + h} L${x + w + 2},${y + h + 8} L${x - 2},${y + h + 8} Z" fill="#9AA0B8"/>`;

  // 場面ごとの構成。bg: 背景, front: キャラの手前に描く物, partner: 相手役
  const SCENES = {
    '会議': { bg: () => wall('#EAF2FF', '#C9D6EE') + rect(150, 18, 130, 70, '#fff', 6, 'stroke="#B5C3E0" stroke-width="3"') + `<path d="M165,72 L190,55 L210,62 L240,36 L265,44" stroke="#4F8CFF" stroke-width="4" fill="none" stroke-linecap="round"/>` + rect(165, 30, 40, 5, '#FF9EB5', 2) + plant(300, 120), front: () => table() + rect(120, 128, 40, 10, '#fff', 2) + rect(200, 130, 16, 10, '#fff', 3), partner: 'colleague' },
    'メール': { bg: () => wall('#F1EDFF', '#D8D0F0') + clock(270, 34) + plant(30, 120), front: () => table('#F2C79E') + laptop(170, 70, 110, 66) + `<g transform="translate(200,86)">${rect(0, 0, 50, 34, '#fff', 4, 'stroke="#8B7FD0" stroke-width="2"')}<path d="M0,0 L25,20 L50,0" stroke="#8B7FD0" stroke-width="2" fill="none"/></g>`, partner: null },
    '電話': { bg: () => wall('#E7FAF5', '#C6E9DF') + clock(250, 36) + plant(292, 120) + windowBox(170, 20, 60, 70), front: () => table('#EFC69C') + `<g transform="translate(118,74) rotate(-20)">${rect(-6, 0, 12, 34, '#3B3F55', 5)}${rect(-3, 4, 6, 22, '#9DE0D0', 2)}</g><path d="M140,56 q8,8 0,16 M148,50 q13,14 0,28" stroke="#2EC4B6" stroke-width="3" fill="none" stroke-linecap="round"/>`, partner: null },
    '交渉': { bg: () => wall('#FFF3E6', '#EBD5BE') + rect(135, 20, 50, 60, '#fff', 4, 'stroke="#E4C9A8" stroke-width="3"') + `<path d="M145,65 L160,40 L175,65 Z" fill="#7BC67E"/><circle cx="170" cy="36" r="6" fill="#FFD23F"/>`, front: () => table('#D9A877') + rect(118, 126, 36, 14, '#fff', 2, 'transform="rotate(-6 136 133)"') + rect(160, 128, 36, 12, '#fff', 2, 'transform="rotate(5 178 134)"') + `<path d="M150,131 l8,-2" stroke="#4F8CFF" stroke-width="2"/>`, partner: 'client' },
    '雑談': { bg: () => wall('#FFF0F3', '#EED3DA') + `<path d="M130,90 L130,40 Q160,8 190,40 L190,90 Z" fill="#fff"/><path d="M136,86 L136,42 Q160,16 184,42 L184,86 Z" fill="#CDEBFF"/>` + `<path d="M0,0 L320,0 L320,14 Q300,24 280,14 Q260,24 240,14 Q220,24 200,14 Q180,24 160,14 Q140,24 120,14 Q100,24 80,14 Q60,24 40,14 Q20,24 0,14 Z" fill="#FF9EB5"/>`, front: () => table('#E7B88C') + `<g>${rect(125, 120, 18, 18, '#fff', 3)}<path d="M143,124 q7,0 7,6 q0,6 -7,6" stroke="#fff" stroke-width="3" fill="none"/><path d="M130,114 q3,-5 0,-9 M136,114 q3,-5 0,-9" stroke="#C8B8C0" stroke-width="2" fill="none"/></g>` + `<g>${rect(178, 120, 18, 18, '#fff', 3)}<path d="M178,124 q-7,0 -7,6 q0,6 7,6" stroke="#fff" stroke-width="3" fill="none"/></g>`, partner: 'teacher' },
    '意見を言う': { bg: () => wall('#FFF8E1', '#EADFC0') + rect(118, 18, 84, 56, '#3D6B5A', 6, 'stroke="#C89B63" stroke-width="4"') + `<circle cx="160" cy="40" r="11" fill="#FFE27A"/><rect x="155" y="51" width="10" height="7" fill="#D8D8E0"/><path d="M140,40 l-8,0 M180,40 l8,0 M160,22 l0,-4 M146,27 l-5,-4 M174,27 l5,-4" stroke="#FFE27A" stroke-width="2.5" stroke-linecap="round"/>`, front: () => table('#E2B285'), partner: 'teacher' },
    '聞き返す': { bg: () => wall('#F3EEFF', '#DCD2F2') + plant(28, 120), front: () => table('#EBC199'), partner: 'screen' },
    '空港': { bg: () => wall('#E6F6FF', '#CFE0EA') + windowBox(120, 14, 110, 72, '#A8DBFF') + `<g transform="translate(175,48) rotate(-12)"><ellipse cx="0" cy="0" rx="26" ry="5" fill="#fff"/><path d="M-4,0 L-14,-14 L-8,-14 L8,0 Z M-4,0 L-14,14 L-8,14 L8,0 Z M-22,0 L-28,-9 L-24,-9 L-16,0 Z" fill="#fff"/></g>` + rect(244, 18, 66, 36, '#2B2D42', 4) + `<g fill="#FFD23F">${rect(250, 25, 30, 4, '#FFD23F', 1)}${rect(284, 25, 18, 4, '#7CE0B0', 1)}${rect(250, 34, 30, 4, '#FFD23F', 1)}${rect(284, 34, 18, 4, '#7CE0B0', 1)}${rect(250, 43, 30, 4, '#FFD23F', 1)}${rect(284, 43, 18, 4, '#FF9EB5', 1)}</g>`, front: () => rect(190, 132, 140, 56, '#B9CCE0', 6) + rect(190, 130, 140, 8, '#9AB0C8', 3) + `<g transform="translate(18,122)">${rect(0, 0, 30, 40, '#FF9F1C', 6)}${rect(9, -8, 12, 10, 'none', 3, 'stroke="#C47410" stroke-width="3"')}${rect(4, 10, 22, 3, '#FFD23F', 1)}</g>`, partner: 'officer' },
    'ホテル': { bg: () => wall('#FFF4E0', '#EAD8B8') + rect(130, 20, 70, 50, '#C89B63', 6) + `<g fill="#FFD23F">${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<circle cx="${143 + c * 15}" cy="${33 + r * 13}" r="3"/>`).join('')).join('')}</g>` + `<path d="M0,0 L320,0 L320,8 L0,8 Z" fill="#E8B04B"/>` + `<circle cx="40" cy="38" r="14" fill="#FFE9A8"/><path d="M40,8 L40,24" stroke="#C89B63" stroke-width="2"/>`, front: () => rect(185, 128, 145, 60, '#B0744A', 6) + rect(185, 124, 145, 10, '#8C5A36', 3) + `<g transform="translate(222,112)"><path d="M-12,12 Q-12,-2 0,-2 Q12,-2 12,12 Z" fill="#FFD23F"/><rect x="-15" y="11" width="30" height="4" rx="2" fill="#C99A1E"/><circle cx="0" cy="-5" r="2.5" fill="#C99A1E"/></g>`, partner: 'staff' },
    'レストラン': { bg: () => wall('#FFEFE6', '#EBD3C5') + `<path d="M150,0 L150,22" stroke="#7A5A48" stroke-width="2"/><path d="M134,34 Q150,14 166,34 Z" fill="#FF9F1C"/><ellipse cx="150" cy="40" rx="18" ry="6" fill="#FFF2B8" opacity=".7"/>` + windowBox(30, 28, 56, 60, '#FFD8B8') + `<g transform="translate(250,30)">${rect(0, 0, 40, 52, '#fff', 4, 'stroke="#E6B8A0" stroke-width="2"')}${rect(8, 10, 24, 3, '#E6B8A0', 1)}${rect(8, 20, 24, 3, '#E6B8A0', 1)}${rect(8, 30, 16, 3, '#E6B8A0', 1)}</g>`, front: () => rect(-10, 138, 200, 50, '#fff') + rect(-10, 136, 200, 6, '#FF9EB5') + `<ellipse cx="120" cy="140" rx="24" ry="6" fill="#fff" stroke="#E6D0C4" stroke-width="2"/><ellipse cx="120" cy="137" rx="14" ry="4" fill="#F4A261"/><path d="M90,128 L90,146 M150,128 L150,146" stroke="#B0B4C8" stroke-width="3" stroke-linecap="round"/>`, partner: 'waiter' },
    'トラブル': { bg: () => rect(0, 0, W, H, '#DFF3FF') + `<g fill="#C7DDF2">${rect(110, 30, 40, 120, '#C7DDF2')}${rect(155, 50, 34, 100, '#B5CFEA')}${rect(250, 20, 44, 130, '#C7DDF2')}</g><g fill="#fff" opacity=".8">${[0, 1, 2, 3].map((i) => rect(118, 40 + i * 22, 8, 10, '#fff') + rect(134, 40 + i * 22, 8, 10, '#fff')).join('')}</g>` + rect(0, 150, W, 30, '#B8BCCB') + `<path d="M0,165 L320,165" stroke="#fff" stroke-width="3" stroke-dasharray="16 12"/>` + `<g transform="translate(212,40)"><rect x="-2" y="0" width="4" height="110" fill="#8A8FA8"/><rect x="-26" y="4" width="40" height="16" rx="3" fill="#2EC4B6"/><path d="M14,4 L22,12 L14,20 Z" fill="#2EC4B6"/><rect x="-14" y="24" width="40" height="16" rx="3" fill="#FF9F1C"/><path d="M-14,24 L-22,32 L-14,40 Z" fill="#FF9F1C"/></g>`, front: () => '', partner: 'passerby' },
  };
  // 面接は4場面で背景の小物だけ変える
  const interviewBg = (item) => () => wall('#EEF1F8', '#D3D9E8') + rect(162, 12, 84, 58, '#fff', 6, 'stroke="#C3CCE0" stroke-width="3"') + `<g transform="translate(44,-6)">${item}</g>` + plant(300, 120);
  const IV = {
    '自己紹介': `${rect(132, 32, 56, 30, '#FFE3EC', 4)}<circle cx="146" cy="47" r="7" fill="#FF9EB5"/>${rect(158, 40, 24, 4, '#FF9EB5', 2)}${rect(158, 50, 18, 4, '#FFC2D0', 2)}`,
    '経歴説明': `${rect(134, 54, 10, 14, '#4F8CFF', 2)}${rect(150, 44, 10, 24, '#4F8CFF', 2)}${rect(166, 34, 10, 34, '#FF5C8A', 2)}${rect(182, 28, 10, 40, '#FF9F1C', 2)}`,
    '志望動機': `<path d="M160,62 C140,48 138,32 150,30 C156,29 160,34 160,38 C160,34 164,29 170,30 C182,32 180,48 160,62 Z" fill="#FF5C8A"/>`,
    '逆質問': `<text x="160" y="64" text-anchor="middle" font-size="40" font-weight="900" fill="#8B5CF6" font-family="sans-serif">?</text>`,
  };
  for (const k of Object.keys(IV)) SCENES[k] = { bg: interviewBg(IV[k]), front: () => table('#C99A6E') + rect(196, 126, 40, 12, '#fff', 2) + `<path d="M246,128 L262,120" stroke="#3B3F55" stroke-width="3" stroke-linecap="round"/>`, partner: 'interviewer' };
  const DEFAULT_SCENE = { work: '会議', lesson: '雑談', travel: '空港', interview: '自己紹介' };

  // ---------- 吹き出し ----------
  function bubble(icon, x, y) {
    if (!icon) return '';
    return `<g transform="translate(${x},${y})">
      <path d="M-8,20 L-22,38 L4,22 Z" fill="#fff"/>
      <ellipse cx="0" cy="0" rx="30" ry="25" fill="#fff"/>
      <ellipse cx="0" cy="0" rx="30" ry="25" fill="none" stroke="rgba(43,45,66,.12)" stroke-width="2"/>
      <text x="0" y="10" text-anchor="middle" font-size="28" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${esc(icon)}</text>
    </g>`;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let uid = 0;
  function drawScene(p, cat) {
    if (p.image) return `<img src="${esc(p.image)}" alt="" class="illust-img">`;
    const key = SCENES[p.scene] ? p.scene : DEFAULT_SCENE[p.cat] || '会議';
    const sc = SCENES[key];
    const hero = { ...(HERO[p.cat] || HERO.lesson), mood: p.mood || 'smile' };
    let partner = '';
    if (sc.partner === 'screen') {
      const id = `scr${uid++}`;
      partner = laptop(178, 26, 124, 92, '#DDF0FF') +
        `<clipPath id="${id}"><rect x="183" y="31" width="114" height="82" rx="4"/></clipPath>` +
        `<g clip-path="url(#${id})">${rect(183, 31, 114, 82, '#FFF6D8')}${plant(280, 92)}${place(chara(CAST.teacher), 240, 76, 0.8, true)}</g>`;
    } else if (sc.partner) {
      partner = place(chara(CAST[sc.partner]), 238, 96, 0.95, true);
    }
    const heroSvg = place(chara(hero), 78, 96, 1);
    return `<svg viewBox="0 14 ${W} 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${sc.bg()}${sc.partner === 'screen' ? '' : partner}${heroSvg}${sc.front()}${sc.partner === 'screen' ? partner : ''}
      ${bubble(p.icon, 152, 58)}
    </svg>`;
  }

  window.drawScene = drawScene;
})();
