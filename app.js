/**
 * 아기 수유량 계산기 - App Logic
 * 월령별 소아과 가이드라인 및 체중 기준 수유량 산출, 밤잠 적용 스케줄 알고리즘, 로컬 스토리지 데이터 캐싱
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
  weight: null,
  isPremature: false,
  gestationalWeeks: 40,
  actualAgeDays: 0,
  correctedAgeDays: 0,
  guideline: null,
  recommendedPerFeeding: 0,
  recommendedFrequency: 0,
  dailyTotal: 0,
  isCustomFrequency: false,
  customFrequency: 8,
  isCustomTotal: false,
  customTotal: 800
};

// ============================================
// DOM Elements
// ============================================
const elements = {
  birthDate: document.getElementById('birth-date'),
  babyWeight: document.getElementById('baby-weight'),
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
  customTotalToggle: document.getElementById('custom-total-toggle'),
  customTotalInput: document.getElementById('custom-total-input'),
  customTotal: document.getElementById('custom-total'),
  totalMinus: document.getElementById('total-minus'),
  totalPlus: document.getElementById('total-plus'),
  scheduleSection: document.getElementById('schedule-section'),
  firstFeedingTime: document.getElementById('first-feeding-time'),
  sleepToggle: document.getElementById('sleep-toggle'),
  sleepOptions: document.getElementById('sleep-options'),
  sleepStartTime: document.getElementById('sleep-start-time'),
  generateScheduleBtn: document.getElementById('generate-schedule-btn'),
  copyScheduleBtn: document.getElementById('copy-schedule-btn'),
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
  elements.sleepToggle.addEventListener('change', handleSleepToggle);
  elements.calculateBtn.addEventListener('click', handleCalculate);
  elements.customFrequencyToggle.addEventListener('change', handleCustomFrequencyToggle);
  elements.freqMinus.addEventListener('click', () => adjustFrequency(-1));
  elements.freqPlus.addEventListener('click', () => adjustFrequency(1));
  elements.customFrequency.addEventListener('change', handleCustomFrequencyChange);
  elements.customTotalToggle.addEventListener('change', handleCustomTotalToggle);
  elements.totalMinus.addEventListener('click', () => adjustCustomTotal(-50));
  elements.totalPlus.addEventListener('click', () => adjustCustomTotal(50));
  elements.customTotal.addEventListener('change', handleCustomTotalChange);
  elements.generateScheduleBtn.addEventListener('click', generateSchedule);
  elements.copyScheduleBtn.addEventListener('click', handleCopySchedule);
  elements.firstFeedingTime.addEventListener('input', handleScheduleInputChange);
  elements.sleepStartTime.addEventListener('input', handleScheduleInputChange);

  // Load saved data from localStorage (Auto calculation if birthdate exists)
  loadSavedData();
}

// ============================================
// LocalStorage caching
// ============================================
function loadSavedData() {
  const savedBirthDate = localStorage.getItem('babyBirthDate');
  const savedWeight = localStorage.getItem('babyWeight');
  const savedPremature = localStorage.getItem('isPremature');
  const savedWeeks = localStorage.getItem('gestationalWeeks');
  const savedSleepToggle = localStorage.getItem('sleepToggle');
  const savedSleepStart = localStorage.getItem('sleepStartTime');
  const savedFirstFeed = localStorage.getItem('firstFeedingTime');

  const savedCustomFreqToggle = localStorage.getItem('isCustomFrequency');
  const savedCustomFreqVal = localStorage.getItem('customFrequency');
  const savedCustomTotalToggle = localStorage.getItem('isCustomTotal');
  const savedCustomTotalVal = localStorage.getItem('customTotal');

  if (savedBirthDate) {
    elements.birthDate.value = savedBirthDate;
  }
  if (savedWeight) {
    elements.babyWeight.value = savedWeight;
  }
  if (savedPremature === 'true') {
    elements.prematureToggle.checked = true;
    handlePrematureToggle();
  }
  if (savedWeeks) {
    elements.gestationalWeeks.value = savedWeeks;
  }
  if (savedSleepToggle === 'true') {
    elements.sleepToggle.checked = true;
    handleSleepToggle();
  }
  if (savedSleepStart) {
    elements.sleepStartTime.value = savedSleepStart;
  }
  if (savedFirstFeed) {
    elements.firstFeedingTime.value = savedFirstFeed;
  }

  // Auto trigger calculation if birthdate is present
  if (savedBirthDate) {
    handleCalculate(true); // pass true to specify it's an auto-load event (avoid scrolling on load)
    
    // Apply saved custom settings
    let needRecalculate = false;
    
    if (savedCustomFreqToggle === 'true') {
      elements.customFrequencyToggle.checked = true;
      elements.customFrequencyInput.style.display = 'block';
      currentState.isCustomFrequency = true;
      if (savedCustomFreqVal) {
        elements.customFrequency.value = savedCustomFreqVal;
        currentState.customFrequency = parseInt(savedCustomFreqVal);
      }
      needRecalculate = true;
    }
    
    if (savedCustomTotalToggle === 'true') {
      elements.customTotalToggle.checked = true;
      elements.customTotalInput.style.display = 'block';
      currentState.isCustomTotal = true;
      if (savedCustomTotalVal) {
        elements.customTotal.value = savedCustomTotalVal;
        currentState.customTotal = parseInt(savedCustomTotalVal);
      }
      needRecalculate = true;
    }
    
    if (needRecalculate) {
      recalculateCustomValues();
    }
  }
}

function saveToLocalStorage() {
  const birthDateStr = elements.birthDate.value;
  const weightStr = elements.babyWeight.value;
  const isPremature = elements.prematureToggle.checked;
  const gestationalWeeks = elements.gestationalWeeks.value;
  const sleepToggle = elements.sleepToggle.checked;
  const sleepStart = elements.sleepStartTime.value;
  const firstFeed = elements.firstFeedingTime.value;

  const isCustomFrequency = elements.customFrequencyToggle.checked;
  const customFrequency = elements.customFrequency.value;
  const isCustomTotal = elements.customTotalToggle.checked;
  const customTotal = elements.customTotal.value;

  localStorage.setItem('babyBirthDate', birthDateStr);
  
  if (weightStr) {
    localStorage.setItem('babyWeight', weightStr);
  } else {
    localStorage.removeItem('babyWeight');
  }

  localStorage.setItem('isPremature', isPremature);
  localStorage.setItem('gestationalWeeks', gestationalWeeks);
  localStorage.setItem('sleepToggle', sleepToggle);
  localStorage.setItem('sleepStartTime', sleepStart);
  localStorage.setItem('firstFeedingTime', firstFeed);

  localStorage.setItem('isCustomFrequency', isCustomFrequency);
  localStorage.setItem('customFrequency', customFrequency);
  localStorage.setItem('isCustomTotal', isCustomTotal);
  localStorage.setItem('customTotal', customTotal);
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

function handleSleepToggle() {
  const show = elements.sleepToggle.checked;
  elements.sleepOptions.style.display = show ? 'block' : 'none';
  if (show) {
    elements.sleepOptions.classList.remove('sleep-options');
    void elements.sleepOptions.offsetWidth; // force reflow
    elements.sleepOptions.classList.add('sleep-options');
  }

  saveToLocalStorage();
  if (currentState.birthDate) {
    updateResultUI();
    if (elements.scheduleTimeline.style.display !== 'none') {
      generateSchedule(true);
    }
  }
}

function handleScheduleInputChange() {
  saveToLocalStorage();
  if (currentState.birthDate) {
    updateResultUI();
    if (elements.scheduleTimeline.style.display !== 'none') {
      generateSchedule(true);
    }
  }
}

function handleCalculate(isAutoLoad = false) {
  const birthDateStr = elements.birthDate.value;
  if (!birthDateStr) {
    if (!isAutoLoad) shakeElement(elements.birthDate);
    return;
  }

  const birthDate = new Date(birthDateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const actualDays = daysBetween(birthDate, today);
  if (actualDays < 0) {
    if (!isAutoLoad) shakeElement(elements.birthDate);
    return;
  }

  currentState.birthDate = birthDate;
  currentState.actualAgeDays = actualDays;
  currentState.isPremature = elements.prematureToggle.checked;

  let ageDaysForGuideline = actualDays;

  if (currentState.isPremature) {
    const gw = parseInt(elements.gestationalWeeks.value);
    if (!gw) {
      if (!isAutoLoad) shakeElement(elements.gestationalWeeks);
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
  
  // Check weight value
  const weightVal = parseFloat(elements.babyWeight.value);
  if (!isNaN(weightVal) && weightVal > 0) {
    currentState.weight = weightVal;
    
    // Weight formula: 150ml per kg, max 1000ml per day
    let rawDailyTotal = Math.min(1000, weightVal * 150);
    
    // Calculate 1 feeding amount (rounded to nearest 10ml)
    let calculatedPerFeeding = Math.round((rawDailyTotal / recFreq) / 10) * 10;
    
    // Ensure it falls within reasonable limits for the age
    calculatedPerFeeding = Math.max(guideline.minPerFeeding, Math.min(guideline.maxPerFeeding, calculatedPerFeeding));
    
    currentState.recommendedFrequency = recFreq;
    currentState.recommendedPerFeeding = calculatedPerFeeding;
    currentState.dailyTotal = calculatedPerFeeding * recFreq;
  } else {
    currentState.weight = null;
    const recPerFeeding = Math.round((guideline.minPerFeeding + guideline.maxPerFeeding) / 2);
    currentState.recommendedFrequency = recFreq;
    currentState.recommendedPerFeeding = recPerFeeding;
    currentState.dailyTotal = recPerFeeding * recFreq;
  }

  currentState.customFrequency = currentState.recommendedFrequency;
  currentState.customTotal = currentState.dailyTotal;

  // Reset custom toggles only on manual calculation
  if (!isAutoLoad) {
    elements.customFrequencyToggle.checked = false;
    elements.customFrequencyInput.style.display = 'none';
    currentState.isCustomFrequency = false;

    elements.customTotalToggle.checked = false;
    elements.customTotalInput.style.display = 'none';
    currentState.isCustomTotal = false;
  }

  // Save successful configuration to LocalStorage
  saveToLocalStorage();

  // Update UI
  updateResultUI();

  // Show sections
  elements.resultSection.style.display = 'block';
  elements.scheduleSection.style.display = 'block';
  elements.guidelinesSection.style.display = 'block';

  // Reset schedule or recreate if loaded from cache
  if (isAutoLoad) {
    generateSchedule(true);
  } else {
    elements.scheduleTimeline.style.display = 'none';
  }

  // Re-trigger animation
  [elements.resultSection, elements.scheduleSection, elements.guidelinesSection].forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });

  // Highlight current row in guidelines table
  highlightCurrentGuideline(guideline);

  // Scroll to results only if user manually clicked "Calculate"
  if (!isAutoLoad) {
    setTimeout(() => {
      elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }
}

function handleCustomFrequencyToggle() {
  const show = elements.customFrequencyToggle.checked;
  elements.customFrequencyInput.style.display = show ? 'block' : 'none';
  currentState.isCustomFrequency = show;

  if (show) {
    elements.customFrequency.value = currentState.customFrequency;
    recalculateCustomValues();
  } else {
    if (currentState.isCustomTotal) {
      recalculateCustomValues();
    } else {
      handleCalculate();
    }
  }
}

function adjustFrequency(delta) {
  let val = parseInt(elements.customFrequency.value) + delta;
  val = Math.max(1, Math.min(16, val));
  elements.customFrequency.value = val;
  currentState.customFrequency = val;
  recalculateCustomValues();
}

function handleCustomFrequencyChange() {
  let val = parseInt(elements.customFrequency.value);
  if (isNaN(val) || val < 1) val = 1;
  if (val > 16) val = 16;
  elements.customFrequency.value = val;
  currentState.customFrequency = val;
  recalculateCustomValues();
}

function handleCustomTotalToggle() {
  const show = elements.customTotalToggle.checked;
  elements.customTotalInput.style.display = show ? 'block' : 'none';
  currentState.isCustomTotal = show;

  if (show) {
    let currentTotal = currentState.dailyTotal || 800;
    currentTotal = Math.round(currentTotal / 50) * 50;
    currentTotal = Math.max(100, Math.min(2000, currentTotal));
    
    elements.customTotal.value = currentTotal;
    currentState.customTotal = currentTotal;
    recalculateCustomValues();
  } else {
    if (currentState.isCustomFrequency) {
      recalculateCustomValues();
    } else {
      handleCalculate();
    }
  }
}

function adjustCustomTotal(delta) {
  let val = parseInt(elements.customTotal.value) + delta;
  val = Math.max(100, Math.min(2000, val));
  elements.customTotal.value = val;
  currentState.customTotal = val;
  recalculateCustomValues();
}

function handleCustomTotalChange() {
  let val = parseInt(elements.customTotal.value);
  if (isNaN(val) || val < 100) val = 100;
  if (val > 2000) val = 2000;
  val = Math.round(val / 10) * 10;
  elements.customTotal.value = val;
  currentState.customTotal = val;
  recalculateCustomValues();
}

function recalculateCustomValues() {
  const guideline = currentState.guideline;
  if (!guideline) return;

  let baseDailyTotal = 0;
  if (currentState.weight) {
    baseDailyTotal = Math.min(1000, currentState.weight * 150);
  } else {
    const recFreq = Math.round((guideline.minFrequency + guideline.maxFrequency) / 2);
    const recPerFeeding = Math.round((guideline.minPerFeeding + guideline.maxPerFeeding) / 2);
    baseDailyTotal = recPerFeeding * recFreq;
  }

  const freq = currentState.isCustomFrequency ? currentState.customFrequency : Math.round((guideline.minFrequency + guideline.maxFrequency) / 2);
  const total = currentState.isCustomTotal ? currentState.customTotal : baseDailyTotal;

  let perFeeding = Math.round((total / freq) / 10) * 10;
  perFeeding = Math.max(10, Math.min(300, perFeeding));

  currentState.recommendedFrequency = freq;
  currentState.recommendedPerFeeding = perFeeding;
  currentState.dailyTotal = perFeeding * freq;

  saveToLocalStorage();
  updateResultUI();

  if (elements.scheduleTimeline.style.display !== 'none') {
    generateSchedule(true);
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

  // Interval calculation
  const isSleep = elements.sleepToggle.checked;
  let intervalText = '';
  let intervalDisplay = '';

  if (isSleep) {
    // If sleep mode is on, we calculate interval based on active time
    const startStr = elements.firstFeedingTime.value;
    const endStr = elements.sleepStartTime.value;
    
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    
    let activeMinutes = 0;
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (endTotal >= startTotal) {
      activeMinutes = endTotal - startTotal;
    } else {
      activeMinutes = (endTotal + 1440) - startTotal;
    }

    const freq = currentState.recommendedFrequency;
    if (freq > 1) {
      const intervalMinutes = Math.round(activeMinutes / (freq - 1));
      const hours = Math.floor(intervalMinutes / 60);
      const minutes = intervalMinutes % 60;
      if (minutes === 0) {
        intervalText = `${hours}`;
        intervalDisplay = `${hours}시간`;
        elements.interval.textContent = intervalText;
        document.querySelector('.interval-card .info-unit').textContent = '시간 (활동 시간 내)';
      } else {
        intervalText = `${hours}시간 ${minutes}분`;
        intervalDisplay = intervalText;
        elements.interval.textContent = intervalText;
        document.querySelector('.interval-card .info-unit').textContent = '활동 시간 내';
      }
    } else {
      elements.interval.textContent = '-';
      intervalDisplay = '-';
      document.querySelector('.interval-card .info-unit').textContent = '수유 횟수 부족';
    }
  } else {
    // 24 hour equal distribution
    const intervalHours = (24 / currentState.recommendedFrequency);
    const hours = Math.floor(intervalHours);
    const minutes = Math.round((intervalHours - hours) * 60);
    if (minutes === 0) {
      intervalText = `${hours}`;
      intervalDisplay = `${hours}시간`;
      elements.interval.textContent = intervalText;
      document.querySelector('.interval-card .info-unit').textContent = '시간';
    } else {
      intervalText = `${hours}시간 ${minutes}분`;
      intervalDisplay = intervalText;
      elements.interval.textContent = intervalText;
      document.querySelector('.interval-card .info-unit').textContent = '';
    }
  }

  // Range info
  const g = currentState.guideline;
  let baseRangeHtml = `
    <strong>${g.label}</strong> 기준 | 
    1회 ${g.minPerFeeding}~${g.maxPerFeeding}ml · 
    하루 ${g.minFrequency}~${g.maxFrequency}회<br>
    <span style="color: var(--color-text-muted); font-size: 0.8em;">💡 ${g.description}</span>
  `;

  if (currentState.isCustomTotal) {
    baseRangeHtml = `
      <strong>📝 사용자 설정 하루 총 수유량 (${currentState.customTotal}ml) 적용됨</strong><br>
      설정된 목표 총량에 따라 1회 수유량이 계산되었습니다. ${currentState.weight ? `(입력된 체중 ${currentState.weight}kg 대비 조절됨)` : ''}<br>
      <span style="color: var(--color-primary); font-size: 0.85em;">주변 가이드: ${g.label} (${g.minPerFeeding}~${g.maxPerFeeding}ml)</span>
    `;
  } else if (currentState.weight) {
    baseRangeHtml = `
      <strong>⚖️ 체중 기반 계산 (${currentState.weight}kg) 적용됨</strong><br>
      체중당 권장량 (150ml/kg) 기준으로 하루 약 ${Math.round(currentState.weight * 150)}ml 산출.<br>
      <span style="color: var(--color-primary); font-size: 0.85em;">주변 가이드: ${g.label} (${g.minPerFeeding}~${g.maxPerFeeding}ml)</span>
    `;
  }

  if (isSleep) {
    baseRangeHtml += `
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(108, 99, 255, 0.15); font-size: 0.85em; color: var(--color-secondary); line-height: 1.5;">
        🌙 <strong>밤잠 시간 설정 적용됨:</strong><br>
        밤잠 시간 동안 수유를 쉬어가기 위해, 낮(활동 시간) 동안의 수유 간격이 <strong>${intervalDisplay}</strong>으로 단축 조정되었습니다.
      </div>
    `;
  }
  
  elements.rangeText.innerHTML = baseRangeHtml;
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
function generateSchedule(isSilent = false) {
  const timeStr = elements.firstFeedingTime.value;
  if (!timeStr) return;

  // Refresh feeding guide cards and range text to ensure they match
  updateResultUI();

  const [hours, minutes] = timeStr.split(':').map(Number);
  const freq = currentState.recommendedFrequency;
  const perFeeding = currentState.recommendedPerFeeding;

  const isSleepMode = elements.sleepToggle.checked;
  const scheduleItems = [];

  if (isSleepMode) {
    const sleepStartStr = elements.sleepStartTime.value;
    const [sleepStartH, sleepStartM] = sleepStartStr.split(':').map(Number);
    
    const startMinutesTotal = hours * 60 + minutes;
    const sleepStartMinutesTotal = sleepStartH * 60 + sleepStartM;
    
    let activeMinutes = 0;
    if (sleepStartMinutesTotal >= startMinutesTotal) {
      activeMinutes = sleepStartMinutesTotal - startMinutesTotal;
    } else {
      activeMinutes = (sleepStartMinutesTotal + 1440) - startMinutesTotal;
    }

    if (freq > 1) {
      const intervalMinutes = Math.round(activeMinutes / (freq - 1));
      
      for (let i = 0; i < freq; i++) {
        const currentTotalMinutes = (startMinutesTotal + intervalMinutes * i) % 1440;
        const h = Math.floor(currentTotalMinutes / 60);
        const m = currentTotalMinutes % 60;
        
        const period = h < 12 ? '오전' : '오후';
        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const displayTime = `${period} ${displayH}:${String(m).padStart(2, '0')}`;
        
        // Mark as sleeping hour if close to sleep boundaries
        const isNight = h >= 22 || h < 6;
        let periodText = h < 12 ? '☀️ 오전' : '🌤️ 오후';
        if (i === 0) periodText = '🌅 첫 수유 (기상)';
        if (i === freq - 1) periodText = '🌙 마지막 수유 (취침 직전)';

        scheduleItems.push({
          number: i + 1,
          time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          displayTime: displayTime,
          amount: perFeeding,
          isNight: isNight,
          period: periodText
        });
      }
    } else {
      // Just 1 feeding
      const period = hours < 12 ? '오전' : '오후';
      const displayH = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      scheduleItems.push({
        number: 1,
        time: timeStr,
        displayTime: `${period} ${displayH}:${String(minutes).padStart(2, '0')}`,
        amount: perFeeding,
        isNight: hours >= 22 || hours < 6,
        period: '🌅 첫 수유 (기상)'
      });
    }

  } else {
    // 24 hour equal distribution
    const intervalMinutes = Math.round((24 * 60) / freq);
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
  }

  // Save schedule preferences to localStorage too
  saveToLocalStorage();

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
  
  // Scroll to timeline (if not silently loaded in background)
  if (!isSilent) {
    setTimeout(() => {
      elements.scheduleTimeline.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 200);
  }
}

// ============================================
// Guidelines Table
// ============================================
function populateGuidelinesTable() {
  elements.guidelinesTbody.innerHTML = FEEDING_GUIDELINES.map(g => {
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
    if (minDays === guideline.minDays) {
      row.classList.add('current-row');
    }
  });
}

// ============================================
// Copy Schedule to Clipboard
// ============================================
function handleCopySchedule() {
  if (!currentState.birthDate) return;

  const actualAgeStr = formatAge(currentState.actualAgeDays);
  const correctedAgeStr = currentState.isPremature ? formatAge(currentState.correctedAgeDays) : '';
  const weightStr = currentState.weight ? `${currentState.weight}kg` : '미입력';
  const totalMl = currentState.dailyTotal;
  const perFeeding = currentState.recommendedPerFeeding;
  const freq = currentState.recommendedFrequency;

  // Get time interval text safely
  const intervalVal = elements.interval.textContent;
  const rawIntervalUnit = document.querySelector('.interval-card .info-unit').textContent;
  const cleanUnit = rawIntervalUnit
    .replace(' (활동 시간 내)', '')
    .replace('활동 시간 내', '')
    .trim();
  const isSleepActive = elements.sleepToggle.checked;
  const intervalStr = `${intervalVal}${cleanUnit}${isSleepActive ? ' (활동 시간 내)' : ''}`;

  // Parse timeline items
  const items = elements.timelineList.querySelectorAll('.timeline-item');
  let scheduleText = '';
  items.forEach(item => {
    const num = item.querySelector('.timeline-number').textContent;
    const time = item.querySelector('.timeline-time').textContent;
    const amount = item.querySelector('.timeline-amount').textContent;
    const period = item.querySelector('.timeline-period').textContent;
    scheduleText += `${num} | ${time} (${amount}) - ${period}\n`;
  });

  let copyText = `🍼 오늘의 아기 수유 스케줄 🍼\n\n`;
  copyText += `📅 나이: 실제 ${actualAgeStr}`;
  if (currentState.isPremature) {
    copyText += ` (교정 ${correctedAgeStr})`;
  }
  copyText += `\n⚖️ 체중: ${weightStr}\n`;
  copyText += `📊 하루 수유 요약:\n`;
  copyText += `   - 1회 수유량: ${perFeeding}ml\n`;
  copyText += `   - 하루 총량: ${totalMl}ml (총 ${freq}회)\n`;
  copyText += `   - 수유 간격: ${intervalStr}\n\n`;
  copyText += `⏰ 수유 시간표:\n`;
  copyText += scheduleText;
  copyText += `\n-----------------------------\n`;
  
  // Get current deployment/access URL dynamically
  const siteUrl = window.location.href.split('?')[0];
  copyText += `✨ 아기 수유 계산기(baby-feed)로 생성됨\n`;
  copyText += `🔗 바로가기: ${siteUrl}`;

  navigator.clipboard.writeText(copyText).then(() => {
    const btn = elements.copyScheduleBtn;
    const originalHtml = btn.innerHTML;
    
    btn.classList.add('success');
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span>복사 완료!</span>
    `;

    setTimeout(() => {
      btn.classList.remove('success');
      btn.innerHTML = originalHtml;
    }, 2000);
  }).catch(err => {
    console.error('복사 실패:', err);
    alert('클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.');
  });
}

// ============================================
// Start the app
// ============================================
init();
