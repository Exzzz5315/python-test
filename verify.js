'use strict';

const assert = require('node:assert/strict');

global.window = {};
require('./public/course-data.js');
require('./public/lesson-details.js');

const course = global.window.COURSE;
const details = global.window.LESSON_DETAILS;
assert.equal(course.days.length, 28, '课程必须包含 28 天');
assert.equal(course.days.reduce((total, day) => total + day.concepts.length, 0), 84, '每天必须有 3 个知识模块');
assert.equal(course.days.reduce((total, day) => total + day.quiz.length, 0), 56, '每天必须有 2 道随堂题');
assert.deepEqual(course.days.map((day) => day.day), Array.from({ length: 28 }, (_, index) => index + 1), '课程日期必须连续');
assert.equal(Object.keys(details).length, 28, '全部 28 天必须有零基础深度讲义');

for (const day of course.days) {
  assert.equal(day.week, Math.ceil(day.day / 7), `Day ${day.day} 周次错误`);
  assert.ok(day.goals.length >= 3, `Day ${day.day} 学习目标不足`);
  assert.ok(day.lab.checks.length >= 4, `Day ${day.day} 任务验收不足`);
  const detail = details[day.day];
  assert.ok(detail, `Day ${day.day} 缺少深度讲义`);
  assert.ok(detail.why.length >= 2, `Day ${day.day} 缺少学习背景`);
  assert.ok(detail.prerequisites.length >= 3, `Day ${day.day} 缺少前置术语`);
  assert.ok(detail.chapters.length >= 3, `Day ${day.day} 深度章节不足`);
  assert.ok(detail.mistakes.length >= 3, `Day ${day.day} 常见错误不足`);
  assert.ok(detail.drills.length >= 3, `Day ${day.day} 递进练习不足`);
  assert.ok(detail.glossary.length >= 4, `Day ${day.day} 术语表不足`);
  for (const item of detail.chapters) {
    assert.ok(item.explanation.length >= 2, `Day ${day.day} 章节讲解过短`);
    assert.ok(item.steps.length >= 3, `Day ${day.day} 缺少代码逐步执行说明`);
    assert.ok(item.code && item.bridge && item.checkpoint.length === 2, `Day ${day.day} 章节结构不完整`);
  }
  for (const question of day.quiz) {
    assert.ok(question.answer >= 0 && question.answer < question.options.length, `Day ${day.day} 答案越界`);
    assert.ok(question.explanation && question.correction, `Day ${day.day} 缺少纠错反馈`);
  }
}

assert.doesNotMatch(JSON.stringify(course), /[—–]/, '页面可见文案不能包含长破折号');
assert.doesNotMatch(JSON.stringify(details), /[—–]/, '深度讲义不能包含长破折号');
const chapterCount = Object.values(details).reduce((total, detail) => total + detail.chapters.length, 0);
console.log(`课程自检通过：28 天，${chapterCount} 个深度章节，84 组递进练习，56 道随堂题。`);
