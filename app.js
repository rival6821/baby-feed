/**
 * 아기 수유량 계산기 - App Logic
 * 월령별 소아과 가이드라인 기반 수유량 및 스케줄 계산
 */

// ============================================
// Feeding Guidelines Data
// ============================================
const FEEDING_GUIDELINES = [
  {
    label: '0~2주',
    minDays: 0,
    maxDays: 13,
    minPerFeeding: 30,
    maxPerFeeding: 60,
    minFrequency: 8,
    maxFrequency: 12,
    description: '신생아 초기에는 소량을 자주 먹입니다.'
  },
  {
    label: '2주~1개월',
    minDays: 14,
    maxDays: 29,
    minPerFeeding: 60,
    maxPerFeeding: 90,
    minFrequency: 8,
    maxFrequency: 10,
    description: '점차 1회 수유량이 늘어납니다.'
  },
  {
    label: '1~2개월',
    minDays: 30,
    maxDays: 59,
    minPerFeeding: 80,
    maxPerFeeding: 120,
    minFrequency: 7,
    maxFrequency: 8,
    description: '수유 간격이 조금씩 벌어지기 시작합니다.'
  },
  {
    label: '2~3개월',
    minDays: 60,
    maxDays: 89,
    minPerFeeding: 120,
    maxPerFeeding: 160,
    minFrequency: 6,
    maxFrequency: 7,
    description: '수유 패턴이 안정되는 시기입니다.'
  },
  {
    label: '3~4개월',
    minDays: 90,
    maxDays: 119,
    minPerFeeding: 150,
    maxPerFeeding: 180,
    minFrequency: 5,
    maxFrequency: 6,
    description: '밤중 수유 횟수가 줄어들 수 있습니다.'
  },
  {
    label: '4~6개월',
    minDays: 120,
    maxDays: 179,
    minPerFeeding: 180,
    maxPerFeeding: 210,
    minFrequency: 5,
    maxFrequency: 6,
    description: '이유식 시작을 준비하는 시기입니다.'
  },
  {
    label: '6~9개월',
    minDays: 180,
    maxDays: 269,
    minPerFeeding: 200,
    maxPerFeeding: 240,
    minFrequency: 4,
    maxFrequency: 5,
    description: '이유식과 병행하여 수유량을 조절합니다.'
  },
  {
    label: '9~12개월',
    minDays: 270,
    maxDays: 364,
    minPerFeeding: 200,
    maxPerFeeding: 240,
    minFrequency: 3,
    maxFrequency: 4,
    description: '이유식이 주식이 되면서 수유 비중이 줄어듭니다.'
  },
  {
    label: '12개월 이상',
    minDays: 365,
    maxDays: Infinity,
    minPerFeeding: 150,
    maxPerFeeding: 200,
    minFrequency: 2,
    maxFrequency: 3,
    description: '일반식 위주로 전환되며 우유/분유는 보충용입니다.'
  }
];

// ============================================
// State
// ============================================
let currentState = {
  birthDate: null,
  isPremature: false,
  gestationalWeeks: 40,
  actualAgeDays: 0,
  correctedAgeDays: 0,
  guideline: null,
  recommendedPerFeeding: 0,
  recommendedFrequency: 0,
  dailyTotal: 0,
  isCustomFrequency: false,
  customFrequency: 8
};

// ============================================
// DOM Elements
// ============================================
const elements = {
  birthDate: document.getElementById('birth-date'),
  prematureToggle: document.getElementById('premature-toggle'),
  prematureOptions: document.getElementById('premature-options'),
  gestationalWeeks: document.getElementById('gestational-weeks'),
  calculateBtn: document.getElementById('calculate-btn'),
  resultSection: document.getElementById('result-section'),
  actualAgeBadge: document.getElementById('actual-age-badge'),
  actualAge: document.getElementById('actual-age'),
  correctedAgeBadge: document.getElementById('corrected-age-badge'),
  correctedAge: document.getElementById('corrected-age'),
  perFeeding: document.getElementById('per-feeding'),
  frequency: document.getElementById('frequency'),
  dailyTotal: document.getElementById('daily-total'),
  interval: document.getElementById('interval'),
  rangeText: document.getElementById('range-text'),
  customFrequencyToggle: document.getElementById('custom-frequency-toggle'),
  customFrequencyInput: document.getElementById('custom-frequency-input'),
  customFrequency: document.getElementById('custom-frequency'),
  freqMinus: document.getElementById('freq-minus'),
  freqPlus: document.getElementById('freq-plus'),
  scheduleSection: document.getElementById('schedule-section'),
  firstFeedingTime: document.getElementById('first-feeding-time'),
  generateScheduleBtn: document.getElementById('generate-schedule-btn'),
  scheduleTimeline: document.getElementById('schedule-timeline'),
  timelineList: document.getElementById('timeline-list'),
  guidelinesSection: document.getElementById('guidelines-section'),
  guidelinesTbody: document.getElementById('guidelines-tbody')
};

// ============================================
// Initialization
// ============================================
function init() {
  // Set max date to today
  const today = new Date();
  elements.birthDate.max = formatDateForInput(today);

  // Populate gestational weeks dropdown (22~36 weeks)
  for (let w = 36; w >= 22; w--) {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = `${w}주`;
    elements.gestationalWeeks.appendChild(opt);
  }

  // Populate guidelines table
  populateGuidelinesTable();

  // Event Listeners
  elements.prematureToggle.addEventListener('change', handlePrematureToggle);
  elements.calculateBtn.addEventListener('click', handleCalculate);
  elements.customFrequencyToggle.addEventListener('change', handleCustomFrequencyToggle);
  elements.freqMinus.addEventListener('click', () => adjustFrequency(-1));
  elements.freqPlus.addEventListener('click', () => adjustFrequency(1));
  elements.customFrequency.addEventListener('change', handleCustomFrequencyChange);
  elements.generateScheduleBtn.addEventListener('click', generateSchedule);
}

// ============================================
// Utility Functions
// ============================================
function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(d1, d2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((d2 - d1) / oneDay);
}

function formatAge(totalDays) {
  if (totalDays < 0) return '아직 태어나지 않았어요';
  
  const years = Math.floor(totalDays / 365);
  const remainingAfterYears = totalDays % 365;
  const months = Math.floor(remainingAfterYears / 30);
  const days = remainingAfterYears % 30;

  const parts = [];
  if (years > 0) parts.push(`${years}년`);
  if (months > 0) parts.push(`${months}개월`);
  if (days > 0 || parts.length === 0) parts.push(`${days}일`);
  
  return parts.join(' ');
}

function getGuideline(ageDays) {
  if (ageDays < 0) ageDays = 0;
  for (const g of FEEDING_GUIDELINES) {
    if (ageDays >= g.minDays && ageDays <= g.maxDays) {
      return g;
    }
  }
  return FEEDING_GUIDELINES[FEEDING_GUIDELINES.length - 1];
}

// ============================================
// Event Handlers
// ============================================
function handlePrematureToggle() {
  const show = elements.prematureToggle.checked;
  elements.prematureOptions.style.display = show ? 'block' : 'none';
  if (show) {
    elements.prematureOptions.classList.remove('premature-options');
    void elements.prematureOptions.offsetWidth; // force reflow
    elements.prematureOptions.classList.add('premature-options');
  }
}

function handleCalculate() {
  const birthDateStr = elements.birthDate.value;
  if (!birthDateStr) {
    shakeElement(elements.birthDate);
    return;
  }

  const birthDate = new Date(birthDateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const actualDays = daysBetween(birthDate, today);
  if (actualDays < 0) {
    shakeElement(elements.birthDate);
    return;
  }

  currentState.birthDate = birthDate;
  currentState.actualAgeDays = actualDays;
  currentState.isPremature = elements.prematureToggle.checked;

  let ageDaysForGuideline = actualDays;

  if (currentState.isPremature) {
    const gw = parseInt(elements.gestationalWeeks.value);
    if (!gw) {
      shakeElement(elements.gestationalWeeks);
      return;
    }
    currentState.gestationalWeeks = gw;
    const weeksEarly = 40 - gw;
    const daysEarly = weeksEarly * 7;
    currentState.correctedAgeDays = Math.max(0, actualDays - daysEarly);
    ageDaysForGuideline = currentState.correctedAgeDays;
  }

  // Get guideline
  const guideline = getGuideline(ageDaysForGuideline);
  currentState.guideline = guideline;

  // Calculate recommended values (use midpoint)
  const recFreq = Math.round((guideline.minFrequency + guideline.maxFrequency) / 2);
  const recPerFeeding = Math.round((guideline.minPerFeeding + guideline.maxPerFeeding) / 2);

  currentState.recommendedFrequency = recFreq;
  currentState.recommendedPerFeeding = recPerFeeding;
  currentState.dailyTotal = recPerFeeding * recFreq;
  currentState.customFrequency = recFreq;

  // Reset custom frequency toggle
  elements.customFrequencyToggle.checked = false;
  elements.customFrequencyInput.style.display = 'none';
  currentState.isCustomFrequency = false;

  // Update UI
  updateResultUI();

  // Show sections
  elements.resultSection.style.display = 'block';
  elements.scheduleSection.style.display = 'block';
  elements.guidelinesSection.style.display = 'block';

  // Reset schedule
  elements.scheduleTimeline.style.display = 'none';

  // Re-trigger animation
  [elements.resultSection, elements.scheduleSection, elements.guidelinesSection].forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });

  // Highlight current row in guidelines table
  highlightCurrentGuideline(guideline);

  // Scroll to results
  setTimeout(() => {
    elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

function handleCustomFrequencyToggle() {
  const show = elements.customFrequencyToggle.checked;
  elements.customFrequencyInput.style.display = show ? 'block' : 'none';
  currentState.isCustomFrequency = show;

  if (show) {
    elements.customFrequency.value = currentState.customFrequency;
    recalculateWithCustomFrequency();
  } else {
    // Restore recommended values
    const guideline = currentState.guideline;
    const recFreq = Math.round((guideline.minFrequency + guideline.maxFrequency) / 2);
    const recPerFeeding = Math.round((guideline.minPerFeeding + guideline.maxPerFeeding) / 2);
    currentState.recommendedFrequency = recFreq;
    currentState.recommendedPerFeeding = recPerFeeding;
    currentState.dailyTotal = recPerFeeding * recFreq;
    updateResultUI();
  }
}

function adjustFrequency(delta) {
  let val = parseInt(elements.customFrequency.value) + delta;
  val = Math.max(1, Math.min(16, val));
  elements.customFrequency.value = val;
  currentState.customFrequency = val;
  recalculateWithCustomFrequency();
}

function handleCustomFrequencyChange() {
  let val = parseInt(elements.customFrequency.value);
  if (isNaN(val) || val < 1) val = 1;
  if (val > 16) val = 16;
  elements.customFrequency.value = val;
  currentState.customFrequency = val;
  recalculateWithCustomFrequency();
}

function recalculateWithCustomFrequency() {
  const freq = currentState.customFrequency;
  const guideline = currentState.guideline;
  // Keep daily total from recommended, adjust per-feeding
  const recFreq = Math.round((guideline.minFrequency + guideline.maxFrequency) / 2);
  const recPerFeeding = Math.round((guideline.minPerFeeding + guideline.maxPerFeeding) / 2);
  const dailyTotal = recPerFeeding * recFreq;
  
  const perFeeding = Math.round(dailyTotal / freq);

  currentState.recommendedFrequency = freq;
  currentState.recommendedPerFeeding = perFeeding;
  currentState.dailyTotal = perFeeding * freq;

  updateResultUI();

  // Update schedule if visible
  if (elements.scheduleTimeline.style.display !== 'none') {
    generateSchedule();
  }
}

// ============================================
// UI Update Functions
// ============================================
function updateResultUI() {
  // Age display
  elements.actualAge.textContent = formatAge(currentState.actualAgeDays);

  if (currentState.isPremature) {
    elements.correctedAgeBadge.style.display = 'block';
    elements.correctedAge.textContent = formatAge(currentState.correctedAgeDays);
  } else {
    elements.correctedAgeBadge.style.display = 'none';
  }

  // Feeding info with animation
  animateValue(elements.perFeeding, currentState.recommendedPerFeeding);
  animateValue(elements.frequency, currentState.recommendedFrequency);
  animateValue(elements.dailyTotal, currentState.dailyTotal);

  // Interval
  const intervalHours = (24 / currentState.recommendedFrequency);
  const hours = Math.floor(intervalHours);
  const minutes = Math.round((intervalHours - hours) * 60);
  let intervalText;
  if (minutes === 0) {
    intervalText = `${hours}`;
    elements.interval.textContent = intervalText;
    document.querySelector('.interval-card .info-unit').textContent = '시간';
  } else {
    intervalText = `${hours}시간 ${minutes}분`;
    elements.interval.textContent = intervalText;
    document.querySelector('.interval-card .info-unit').textContent = '';
  }

  // Range info
  const g = currentState.guideline;
  elements.rangeText.innerHTML = `
    <strong>${g.label}</strong> 기준 | 
    1회 ${g.minPerFeeding}~${g.maxPerFeeding}ml · 
    하루 ${g.minFrequency}~${g.maxFrequency}회<br>
    <span style="color: var(--color-text-muted); font-size: 0.8em;">💡 ${g.description}</span>
  `;
}

function animateValue(element, target) {
  const current = parseInt(element.textContent) || 0;
  if (current === target) {
    element.textContent = target;
    return;
  }
  
  const duration = 600;
  const steps = 30;
  const stepTime = duration / steps;
  const increment = (target - current) / steps;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    if (step >= steps) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.round(current + increment * step);
    }
  }, stepTime);
}

function shakeElement(el) {
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'shake 0.4s ease';
  el.addEventListener('animationend', () => {
    el.style.animation = '';
  }, { once: true });

  // Add temporary red border
  el.style.borderColor = '#e74c3c';
  setTimeout(() => {
    el.style.borderColor = '';
  }, 1500);
}

// Add shake animation via JS (since it's not in CSS)
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
`;
document.head.appendChild(shakeStyle);

// ============================================
// Schedule Generation
// ============================================
function generateSchedule() {
  const timeStr = elements.firstFeedingTime.value;
  if (!timeStr) return;

  const [hours, minutes] = timeStr.split(':').map(Number);
  const freq = currentState.recommendedFrequency;
  const perFeeding = currentState.recommendedPerFeeding;
  const intervalMinutes = Math.round((24 * 60) / freq);

  const scheduleItems = [];
  for (let i = 0; i < freq; i++) {
    const totalMinutes = (hours * 60 + minutes + intervalMinutes * i) % (24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const isNight = h >= 22 || h < 6;
    const period = h < 12 ? '오전' : '오후';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    
    scheduleItems.push({
      number: i + 1,
      time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      displayTime: `${period} ${displayH}:${String(m).padStart(2, '0')}`,
      amount: perFeeding,
      isNight: isNight,
      period: isNight ? '🌙 야간' : h < 12 ? '☀️ 오전' : '🌤️ 오후'
    });
  }

  // Render timeline
  elements.timelineList.innerHTML = scheduleItems.map((item, idx) => `
    <div class="timeline-item ${item.isNight ? 'night-feed' : ''}" 
         style="animation-delay: ${idx * 0.08}s">
      <span class="timeline-number">${item.number}회</span>
      <span class="timeline-time">${item.displayTime}</span>
      <span class="timeline-amount">${item.amount}ml</span>
      <span class="timeline-period">${item.period}</span>
    </div>
  `).join('');

  elements.scheduleTimeline.style.display = 'block';
  
  // Scroll to timeline
  setTimeout(() => {
    elements.scheduleTimeline.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 200);
}

// ============================================
// Guidelines Table
// ============================================
function populateGuidelinesTable() {
  elements.guidelinesTbody.innerHTML = FEEDING_GUIDELINES.map(g => {
    const avgPerFeeding = Math.round((g.minPerFeeding + g.maxPerFeeding) / 2);
    const avgFreq = Math.round((g.minFrequency + g.maxFrequency) / 2);
    const totalMin = g.minPerFeeding * g.minFrequency;
    const totalMax = g.maxPerFeeding * g.maxFrequency;
    return `
      <tr data-min-days="${g.minDays}" data-max-days="${g.maxDays}">
        <td>${g.label}</td>
        <td>${g.minPerFeeding}~${g.maxPerFeeding}ml</td>
        <td>${g.minFrequency}~${g.maxFrequency}회</td>
        <td>${totalMin}~${totalMax}ml</td>
      </tr>
    `;
  }).join('');
}

function highlightCurrentGuideline(guideline) {
  // Remove previous highlight
  elements.guidelinesTbody.querySelectorAll('tr').forEach(row => {
    row.classList.remove('current-row');
  });

  // Add highlight to matching row
  const rows = elements.guidelinesTbody.querySelectorAll('tr');
  rows.forEach(row => {
    const minDays = parseInt(row.dataset.minDays);
    const maxDays = parseInt(row.dataset.maxDays) || Infinity;
    if (minDays === guideline.minDays) {
      row.classList.add('current-row');
    }
  });
}

// ============================================
// Start the app
// ============================================
init();
