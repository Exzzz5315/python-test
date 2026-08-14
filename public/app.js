'use strict';

const STORAGE_KEY = 'python-classroom-progress-v1';
const THEME_KEY = 'python-classroom-theme';
const course = window.COURSE;
const lessonDetails = window.LESSON_DETAILS;

const defaultState = { currentDay: 1, completed: [], scores: {} };
let state = loadState();
let copyTargets = [];
let toastTimer;

const lessonElement = document.querySelector('#lesson');
const courseListElement = document.querySelector('#course-list');
const dayPickerElement = document.querySelector('#day-picker');
const themeToggleElement = document.querySelector('#theme-toggle');

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.completed) || typeof saved.scores !== 'object') {
      return { ...defaultState };
    }
    return {
      currentDay: Math.min(28, Math.max(1, Number(saved.currentDay) || 1)),
      completed: saved.completed.filter((day) => Number.isInteger(day) && day >= 1 && day <= 28),
      scores: saved.scores,
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function getCurrentDay() {
  return course.days[state.currentDay - 1];
}

function getSavedScore(day) {
  return state.scores[String(day)] || null;
}

function renderCode(code) {
  const copyIndex = copyTargets.push(code) - 1;
  return `
    <div class="code-block">
      <button class="copy-button" type="button" data-copy-index="${copyIndex}">复制</button>
      <pre><code>${escapeHtml(code)}</code></pre>
    </div>`;
}

function renderSidebar() {
  const groups = course.weeks.map((weekTitle, weekIndex) => {
    const days = course.days.filter((day) => day.week === weekIndex + 1);
    const links = days.map((day) => {
      const active = day.day === state.currentDay;
      const completed = state.completed.includes(day.day);
      return `
        <button class="day-link" type="button" data-day="${day.day}" ${active ? 'aria-current="page"' : ''}>
          <span class="day-number">${String(day.day).padStart(2, '0')}</span>
          <span class="day-name">${escapeHtml(day.title)}</span>
          <span class="day-state" aria-label="${completed ? '已完成' : '未完成'}">${completed ? '✓' : ''}</span>
        </button>`;
    }).join('');
    return `<section class="week-group"><h2 class="week-title">第 ${weekIndex + 1} 周　${escapeHtml(weekTitle)}</h2>${links}</section>`;
  }).join('');

  courseListElement.innerHTML = groups;
  courseListElement.querySelectorAll('[data-day]').forEach((button) => {
    button.addEventListener('click', () => navigateToDay(Number(button.dataset.day)));
  });
}

function renderDayPicker() {
  dayPickerElement.innerHTML = course.days.map((day) => (
    `<option value="${day.day}" ${day.day === state.currentDay ? 'selected' : ''}>Day ${day.day}　${escapeHtml(day.title)}</option>`
  )).join('');
}

function renderProgress() {
  const completed = new Set(state.completed).size;
  const percent = Math.round((completed / course.days.length) * 100);
  document.querySelector('#progress-count').textContent = `${completed} / ${course.days.length}`;
  document.querySelector('#progress-percent').textContent = `${percent}% 已完成`;
  document.querySelector('#progress-fill').style.width = `${percent}%`;
}

function renderStudyPanel() {
  const day = getCurrentDay();
  const saved = getSavedScore(day.day);
  document.querySelector('#time-plan').innerHTML = course.schedule.map(([duration, label]) => (
    `<li><time>${escapeHtml(duration)}</time><span>${escapeHtml(label)}</span></li>`
  )).join('');
  document.querySelector('#study-tip').textContent = day.tip;

  const scoreValue = document.querySelector('#score-value');
  const scoreNote = document.querySelector('#score-note');
  if (!saved) {
    scoreValue.textContent = '尚未测验';
    scoreNote.textContent = '完成随堂题后，这里会显示薄弱知识点。';
    return;
  }

  scoreValue.textContent = `${saved.score} 分`;
  scoreNote.textContent = saved.missed.length
    ? `建议复习：${saved.missed.join('、')}。`
    : '两题均正确，可以继续完成代码任务。';
}

function renderQuiz(day) {
  const saved = getSavedScore(day.day);
  const questions = day.quiz.map((question, questionIndex) => {
    const savedAnswer = saved?.answers?.[questionIndex];
    const feedbackClass = savedAnswer === undefined ? '' : savedAnswer === question.answer ? 'correct' : 'wrong';
    const feedbackText = savedAnswer === undefined
      ? ''
      : savedAnswer === question.answer
        ? `正确。${question.explanation}`
        : `需要复习「${question.topic}」。${question.explanation} 建议：${question.correction}`;
    const options = question.options.map((option, optionIndex) => `
      <label class="option">
        <input type="radio" name="q-${day.day}-${questionIndex}" value="${optionIndex}" ${savedAnswer === optionIndex ? 'checked' : ''} />
        <span>${escapeHtml(option)}</span>
      </label>`).join('');
    return `
      <fieldset class="quiz-question" data-question="${questionIndex}">
        <legend>${questionIndex + 1}. ${escapeHtml(question.question)}</legend>
        ${options}
        <div class="quiz-feedback ${feedbackClass}">${escapeHtml(feedbackText)}</div>
      </fieldset>`;
  }).join('');

  return `
    <form id="quiz-form">
      <div class="quiz-list">${questions}</div>
      <div class="quiz-actions">
        <button class="primary-button" type="submit">${saved ? '重新提交' : '提交答案'}</button>
        <span class="quiz-status">${saved ? `上次得分 ${saved.score} 分` : '答完两题后立即查看原因'}</span>
      </div>
    </form>`;
}

function renderDeepLesson(day) {
  const detail = lessonDetails[day.day];
  const prerequisites = detail.prerequisites.map(([term, meaning]) => `
    <div class="prerequisite-item">
      <dt>${escapeHtml(term)}</dt>
      <dd>${escapeHtml(meaning)}</dd>
    </div>`).join('');
  const chapterNavigation = detail.chapters.map((item, index) => `
    <a href="#chapter-${day.day}-${index + 1}">
      <span>${String(index + 1).padStart(2, '0')}</span>
      ${escapeHtml(item.title)}
    </a>`).join('');
  const chapters = detail.chapters.map((item, index) => `
    <article class="deep-chapter" id="chapter-${day.day}-${index + 1}">
      <header class="chapter-header">
        <p>第 ${index + 1} 讲</p>
        <h3>${escapeHtml(item.title)}</h3>
        <strong>${escapeHtml(item.question)}</strong>
      </header>
      <div class="teacher-explanation">
        ${item.explanation.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      </div>
      ${renderCode(item.code)}
      <section class="walkthrough" aria-label="代码执行过程">
        <h4>代码是怎样一步步执行的</h4>
        <ol>${item.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      </section>
      <aside class="frontend-bridge">
        <strong>用前端经验理解</strong>
        <p>${escapeHtml(item.bridge)}</p>
      </aside>
      <details class="checkpoint">
        <summary>理解检查：${escapeHtml(item.checkpoint[0])}</summary>
        <p>${escapeHtml(item.checkpoint[1])}</p>
      </details>
    </article>`).join('');
  const mistakes = detail.mistakes.map(([symptom, reason, fix]) => `
    <article class="mistake-item">
      <h3>${escapeHtml(symptom)}</h3>
      <p><strong>为什么：</strong>${escapeHtml(reason)}</p>
      <p><strong>怎么改：</strong>${escapeHtml(fix)}</p>
    </article>`).join('');
  const drills = detail.drills.map(([title, task, hint, expected], index) => `
    <article class="drill-item">
      <span>练习 ${index + 1}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(task)}</p>
      <details>
        <summary>需要时查看提示</summary>
        <p>${escapeHtml(hint)}</p>
      </details>
      <details>
        <summary>完成后核对结果</summary>
        <p>${escapeHtml(expected)}</p>
      </details>
    </article>`).join('');
  const glossary = detail.glossary.map(([term, meaning]) => `
    <div class="glossary-item"><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(meaning)}</dd></div>`).join('');

  return `
    <section class="lesson-section lesson-foundation" aria-labelledby="foundation-heading">
      <h2 id="foundation-heading">先建立完整背景</h2>
      <div class="why-this-matters">
        ${detail.why.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      </div>
      <h3 class="subsection-title">开始前先认识这些词</h3>
      <dl class="prerequisite-list">${prerequisites}</dl>
    </section>

    <nav class="chapter-navigation" aria-label="本课内容目录">
      <p>本课内容</p>
      ${chapterNavigation}
    </nav>

    <section class="lesson-section" aria-labelledby="deep-concepts-heading">
      <h2 id="deep-concepts-heading">从零讲透</h2>
      <div class="deep-chapter-list">${chapters}</div>
    </section>

    <section class="lesson-section" aria-labelledby="mistakes-heading">
      <h2 id="mistakes-heading">初学者最容易错在哪里</h2>
      <div class="mistake-list">${mistakes}</div>
    </section>

    <section class="lesson-section" aria-labelledby="drills-heading">
      <h2 id="drills-heading">先小练，再做完整任务</h2>
      <div class="drill-list">${drills}</div>
    </section>

    <section class="lesson-section" aria-labelledby="glossary-heading">
      <h2 id="glossary-heading">今天必须能解释的术语</h2>
      <dl class="glossary-list">${glossary}</dl>
    </section>`;
}

function renderLesson() {
  const day = getCurrentDay();
  const saved = getSavedScore(day.day);
  const completed = state.completed.includes(day.day);
  const detail = lessonDetails[day.day];

  lessonElement.innerHTML = `
    <header class="lesson-header">
      <p class="lesson-kicker">DAY ${String(day.day).padStart(2, '0')} / 第 ${day.week} 周</p>
      <h1>${escapeHtml(day.title)}</h1>
      <p class="lesson-intro">${escapeHtml(day.intro)}</p>
      <div class="lesson-meta"><span>约 4 小时</span><span>${detail.chapters.length} 个深度章节</span><span>3 组递进练习</span><span>1 项代码任务</span></div>
    </header>

    <section class="lesson-section" aria-labelledby="goals-heading">
      <h2 id="goals-heading">今天学会什么</h2>
      <ul class="goal-list">${day.goals.map((goal) => `<li>${escapeHtml(goal)}</li>`).join('')}</ul>
    </section>

    ${renderDeepLesson(day)}

    <section class="lesson-section" aria-labelledby="lab-heading">
      <h2 id="lab-heading">动手任务</h2>
      <div class="lab">
        <h3>${escapeHtml(day.lab.title)}</h3>
        <p>${escapeHtml(day.lab.brief)}</p>
        ${renderCode(day.lab.starter)}
        <h4>完成标准</h4>
        <ul class="check-list">${day.lab.checks.map((check) => `<li>${escapeHtml(check)}</li>`).join('')}</ul>
      </div>
    </section>

    <section class="lesson-section" aria-labelledby="quiz-heading">
      <h2 id="quiz-heading">随堂小测</h2>
      ${renderQuiz(day)}
    </section>

    <div class="lesson-actions">
      <button class="secondary-button" id="previous-day" type="button" ${day.day === 1 ? 'disabled' : ''}>上一课</button>
      <button class="primary-button" id="complete-day" type="button" ${!saved || saved.score < 50 ? 'disabled' : ''}>
        ${completed ? '已完成，进入下一课' : '完成本课'}
      </button>
      <button class="secondary-button" id="next-day" type="button" ${day.day === 28 ? 'disabled' : ''}>下一课</button>
    </div>`;

  bindLessonEvents();
}

function bindLessonEvents() {
  const day = getCurrentDay();

  document.querySelectorAll('[data-copy-index]').forEach((button) => {
    button.addEventListener('click', async () => {
      const text = copyTargets[Number(button.dataset.copyIndex)];
      try {
        await navigator.clipboard.writeText(text);
        showToast('代码已复制');
      } catch {
        showToast('浏览器未允许复制，请手动选择代码');
      }
    });
  });

  document.querySelector('#quiz-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const answers = day.quiz.map((_, index) => {
      const checked = document.querySelector(`input[name="q-${day.day}-${index}"]:checked`);
      return checked ? Number(checked.value) : undefined;
    });

    if (answers.some((answer) => answer === undefined)) {
      showToast('请先完成两道题');
      return;
    }

    let correctCount = 0;
    const missed = [];
    day.quiz.forEach((question, index) => {
      const correct = answers[index] === question.answer;
      if (correct) correctCount += 1;
      else missed.push(question.topic);
      const feedback = document.querySelector(`[data-question="${index}"] .quiz-feedback`);
      feedback.className = `quiz-feedback ${correct ? 'correct' : 'wrong'}`;
      feedback.textContent = correct
        ? `正确。${question.explanation}`
        : `需要复习「${question.topic}」。${question.explanation} 建议：${question.correction}`;
    });

    const score = Math.round((correctCount / day.quiz.length) * 100);
    state.scores[String(day.day)] = { score, missed: [...new Set(missed)], answers };
    saveState();
    renderStudyPanel();
    const status = document.querySelector('.quiz-status');
    status.textContent = score === 100 ? '全部正确，可以完成本课' : `得分 ${score}，请根据反馈重做错题`;
    document.querySelector('#complete-day').disabled = score < 50;
    showToast(score === 100 ? '全部正确' : '已生成针对性复习建议');
  });

  document.querySelector('#previous-day').addEventListener('click', () => navigateToDay(day.day - 1));
  document.querySelector('#next-day').addEventListener('click', () => navigateToDay(day.day + 1));
  document.querySelector('#complete-day').addEventListener('click', () => {
    const saved = getSavedScore(day.day);
    if (!saved || saved.score < 50) {
      showToast('随堂测验达到 50 分后才能完成本课');
      return;
    }
    if (!state.completed.includes(day.day)) state.completed.push(day.day);
    saveState();
    renderSidebar();
    renderProgress();
    if (day.day < course.days.length) navigateToDay(day.day + 1);
    else {
      renderLesson();
      showToast('28 天课程已全部完成');
    }
  });
}

function navigateToDay(dayNumber) {
  if (dayNumber < 1 || dayNumber > course.days.length) return;
  state.currentDay = dayNumber;
  saveState();
  copyTargets = [];
  renderAll();
  history.replaceState(null, '', `#day-${dayNumber}`);
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function renderAll() {
  renderSidebar();
  renderDayPicker();
  renderProgress();
  renderStudyPanel();
  renderLesson();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const next = theme === 'dark' ? '浅色' : '深色';
  themeToggleElement.textContent = next;
  themeToggleElement.setAttribute('aria-label', `切换为${next}主题`);
}

dayPickerElement.addEventListener('change', (event) => navigateToDay(Number(event.target.value)));

themeToggleElement.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme;
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

document.querySelector('#reset-progress').addEventListener('click', () => {
  if (!window.confirm('确定重置全部学习进度和测验记录吗？')) return;
  state = { ...defaultState, completed: [], scores: {} };
  saveState();
  navigateToDay(1);
  showToast('学习进度已重置');
});

document.querySelector('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  navigateToDay(1);
});

const hashDay = Number(location.hash.match(/^#day-(\d+)$/)?.[1]);
if (hashDay >= 1 && hashDay <= course.days.length) state.currentDay = hashDay;

const savedTheme = localStorage.getItem(THEME_KEY);
const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
applyTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : preferredTheme);
renderAll();
