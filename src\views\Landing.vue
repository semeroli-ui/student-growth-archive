<template>
  <div class="landing">
    <!-- ===== 顶部导航 ===== -->
    <header class="l-nav" :class="{ scrolled }">
      <div class="l-nav-inner">
        <a class="l-logo" href="#top" @click.prevent="scrollTo('#top')">
          <span class="l-logo-mark">
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="#2f7d6e"/>
              <path d="M11 25l6-7 5 4 7-9" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="29" cy="13" r="2.6" fill="#8fd0c0"/>
            </svg>
          </span>
          <span class="l-logo-text">学生成长档案</span>
        </a>
        <nav class="l-menu">
          <a href="#features" @click.prevent="scrollTo('#features')">核心功能</a>
          <a href="#method" @click.prevent="scrollTo('#method')">使用方式</a>
          <a href="#security" @click.prevent="scrollTo('#security')">数据安全</a>
        </nav>
        <div class="l-nav-cta">
          <a class="l-login-link" href="#/login">登录</a>
          <button class="l-btn l-btn-solid" @click="goApp">进入系统</button>
        </div>
      </div>
    </header>

    <!-- ===== HERO ===== -->
    <section id="top" class="l-hero">
      <div class="l-hero-bg">
        <div class="l-grid-bg"></div>
        <div class="l-glow l-glow-1"></div>
        <div class="l-glow l-glow-2"></div>
      </div>
      <div class="l-hero-inner">
        <div class="l-hero-copy reveal">
          <div class="l-eyebrow">
            <span class="l-eyebrow-dot"></span>
            STUDENT GROWTH ARCHIVE
          </div>
          <h1 class="l-title">
            让每一个孩子的成长
            <span class="l-title-accent">都有迹可循</span>
          </h1>
          <p class="l-sub">
            成绩、作业、行为与心理状态，多维度记录汇聚成一份会生长的成长档案。
            轻量打卡 + AI 分析，让班主任从数据里看见每个孩子真实的进步曲线。
          </p>
          <div class="l-cta-row">
            <button class="l-btn l-btn-solid l-btn-lg" @click="goApp">
              教师登录
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
            <button class="l-btn l-btn-ghost l-btn-lg" @click="scrollTo('#features')">了解功能</button>
          </div>
          <div class="l-hero-meta">
            <span>⚡ 10 秒完成日常打卡</span>
            <span class="l-meta-sep">·</span>
            <span>🤖 AI 生成个性化画像</span>
            <span class="l-meta-sep">·</span>
            <span>🔒 心理数据仅教师可见</span>
          </div>
        </div>

        <!-- Hero 视觉：成长趋势面板 -->
        <div class="l-hero-visual reveal" style="animation-delay:.15s">
          <div class="l-panel">
            <div class="l-panel-head">
              <div class="l-panel-title">
                <span class="l-panel-avatar">李</span>
                <div>
                  <div class="l-panel-name">李明 · 高三(2)班</div>
                  <div class="l-panel-sub">成长画像 · 本学期</div>
                </div>
              </div>
              <span class="l-trend-chip">▲ 稳步上升</span>
            </div>
            <div class="l-chart">
              <svg viewBox="0 0 420 180" fill="none" preserveAspectRatio="none">
                <!-- 网格 -->
                <g class="l-chart-grid" stroke="#e7efec" stroke-width="1">
                  <line x1="0" y1="36" x2="420" y2="36"/>
                  <line x1="0" y1="72" x2="420" y2="72"/>
                  <line x1="0" y1="108" x2="420" y2="108"/>
                  <line x1="0" y1="144" x2="420" y2="144"/>
                  <line x1="70" y1="0" x2="70" y2="180"/>
                  <line x1="140" y1="0" x2="140" y2="180"/>
                  <line x1="210" y1="0" x2="210" y2="180"/>
                  <line x1="280" y1="0" x2="280" y2="180"/>
                  <line x1="350" y1="0" x2="350" y2="180"/>
                </g>
                <!-- 面积 -->
                <defs>
                  <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#2f7d6e" stop-opacity="0.22"/>
                    <stop offset="100%" stop-color="#2f7d6e" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path class="l-chart-area" d="M0,124 C30,120 40,104 70,100 C100,96 110,116 140,106 C170,96 180,74 210,78 C240,82 250,104 280,92 C310,80 330,54 350,52 C370,50 395,44 420,34 L420,180 L0,180 Z" fill="url(#areaG)"/>
                <!-- 趋势线 -->
                <path class="l-chart-line" d="M0,124 C30,120 40,104 70,100 C100,96 110,116 140,106 C170,96 180,74 210,78 C240,82 250,104 280,92 C310,80 330,54 350,52 C370,50 395,44 420,34" stroke="#2f7d6e" stroke-width="3" stroke-linecap="round"/>
                <!-- 数据点 -->
                <circle cx="70" cy="100" r="4" fill="#fff" stroke="#2f7d6e" stroke-width="2.4"/>
                <circle cx="210" cy="78" r="4" fill="#fff" stroke="#2f7d6e" stroke-width="2.4"/>
                <circle class="l-chart-live" cx="350" cy="52" r="5" fill="#fff" stroke="#2f7d6e" stroke-width="2.6"/>
                <circle class="l-chart-pulse" cx="350" cy="52" r="5" fill="none" stroke="#2f7d6e" stroke-width="2"/>
              </svg>
            </div>
            <div class="l-panel-axis">
              <span>月考</span><span>期中</span><span>月考</span><span>期末</span>
            </div>
          </div>

          <!-- 浮动小卡片 -->
          <div class="l-float l-float-1">
            <div class="l-float-icon">📝</div>
            <div>
              <div class="l-float-k">作业提交率</div>
              <div class="l-float-v">96.4% <em>↑ 2.1%</em></div>
            </div>
          </div>
          <div class="l-float l-float-2">
            <div class="l-float-icon ai">✨</div>
            <div>
              <div class="l-float-k">AI 成长建议</div>
              <div class="l-float-v2">近期专注度提升，建议…</div>
            </div>
          </div>
        </div>
      </div>
      <div class="l-hero-scroll" @click="scrollTo('#features')">
        <span>向下滚动</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </section>

    <!-- ===== 数据指标条 ===== -->
    <section class="l-stats reveal">
      <div class="l-stats-inner">
        <div class="l-stat">
          <div class="l-stat-num">10<span>s</span></div>
          <div class="l-stat-label">完成一次日常打卡</div>
        </div>
        <div class="l-stat">
          <div class="l-stat-num">6<span>维</span></div>
          <div class="l-stat-label">行为与成长记录维度</div>
        </div>
        <div class="l-stat">
          <div class="l-stat-num">1<span>份</span></div>
          <div class="l-stat-label">自动生成的学期成长画像</div>
        </div>
        <div class="l-stat">
          <div class="l-stat-num">3<span>级</span></div>
          <div class="l-stat-label">教师 / 学生 / 家长权限分级</div>
        </div>
      </div>
    </section>

    <!-- ===== 核心功能 ===== -->
    <section id="features" class="l-section">
      <div class="l-section-head reveal">
        <div class="l-eyebrow"><span class="l-eyebrow-dot"></span>CORE FEATURES</div>
        <h2 class="l-h2">不止记录，更是看见</h2>
        <p class="l-desc">把零散的日常观察沉淀为结构化数据，再转化为可行动的育人建议。</p>
      </div>

      <div class="l-feat-grid">
        <article class="l-feat reveal">
          <div class="l-feat-icon" style="--ic:#2f7d6e;--ic-bg:#e6f4f1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 3 6-8"/><path d="M3 21h18"/><path d="M18 7h3v3"/></svg>
          </div>
          <h3>成绩趋势可视化</h3>
          <p>历次考试成绩自动成图，单科走势、班级对比一目了然。进步与波动不再靠印象判断，曲线会说话。</p>
        </article>
        <article class="l-feat reveal" style="animation-delay:.06s">
          <div class="l-feat-icon" style="--ic:#3a7bd5;--ic-bg:#e9f0fb">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9L12 3z"/><path d="M12 8l3.8 2.2v4.6L12 17l-3.8-2.2v-4.6L12 8z"/></svg>
          </div>
          <h3>行为雷达画像</h3>
          <p>专注度、参与感、协作、情绪状态等多维行为数据，生成个人雷达画像，发现成绩背后的真实原因。</p>
        </article>
        <article class="l-feat reveal" style="animation-delay:.12s">
          <div class="l-feat-icon" style="--ic:#e8843c;--ic-bg:#fdeee2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
          </div>
          <h3>10 秒轻量打卡</h3>
          <p>点选式录入，不做负担。作业、课堂表现、情绪状态随手上报，碎片时间即可完成全班观察记录。</p>
        </article>
        <article class="l-feat reveal" style="animation-delay:.18s">
          <div class="l-feat-icon" style="--ic:#6b5bd0;--ic-bg:#efecfa">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/></svg>
          </div>
          <h3>AI 个性化分析</h3>
          <p>基于积累的成长数据，自动生成学期画像、薄弱点诊断与家校沟通建议，把班主任从报表中解放出来。</p>
        </article>
      </div>
    </section>

    <!-- ===== 使用方式 ===== -->
    <section id="method" class="l-section l-section-tint">
      <div class="l-section-head reveal">
        <div class="l-eyebrow"><span class="l-eyebrow-dot"></span>HOW IT WORKS</div>
        <h2 class="l-h2">三步，开始积累</h2>
        <p class="l-desc">无需复杂配置，从第一次记录到第一份成长画像，最快一周见效。</p>
      </div>
      <div class="l-steps">
        <div class="l-step reveal">
          <div class="l-step-num">01</div>
          <div class="l-step-body">
            <h3>建班导入</h3>
            <p>创建班级，批量导入学生名单，一次设置永久复用。</p>
          </div>
        </div>
        <div class="l-step-arrow reveal" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2f7d6e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div>
        <div class="l-step reveal" style="animation-delay:.08s">
          <div class="l-step-num">02</div>
          <div class="l-step-body">
            <h3>日常记录</h3>
            <p>课后 10 秒点选打卡：作业、表现、情绪，数据自然积累。</p>
          </div>
        </div>
        <div class="l-step-arrow reveal" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2f7d6e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div>
        <div class="l-step reveal" style="animation-delay:.16s">
          <div class="l-step-num">03</div>
          <div class="l-step-body">
            <h3>AI 生成画像</h3>
            <p>期末自动产出成长档案：趋势图表、雷达画像、评语建议，一键导出 PDF。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 数据安全 ===== -->
    <section id="security" class="l-section">
      <div class="l-sec-grid">
        <div class="l-sec-copy reveal">
          <div class="l-eyebrow"><span class="l-eyebrow-dot"></span>PRIVACY FIRST</div>
          <h2 class="l-h2">孩子的数据，值得被认真对待</h2>
          <p class="l-desc">面向校园场景设计的分级权限体系，敏感心理数据默认不向无关角色开放。</p>
          <ul class="l-sec-list">
            <li>
              <span class="l-check">✓</span>
              <div><strong>角色权限分级</strong>教师、学生、家长各见所需，最小化数据暴露面。</div>
            </li>
            <li>
              <span class="l-check">✓</span>
              <div><strong>心理数据保护</strong>情绪与心理状态记录仅教师可见，不进入学生端展示。</div>
            </li>
            <li>
              <span class="l-check">✓</span>
              <div><strong>边缘网络托管</strong>基于 Cloudflare 边缘网络，全程加密传输与存储。</div>
            </li>
            <li>
              <span class="l-check">✓</span>
              <div><strong>合规采集</strong>只采集育人所需字段，遵循最小必要原则。</div>
            </li>
          </ul>
        </div>
        <div class="l-sec-visual reveal" style="animation-delay:.1s">
          <div class="l-sec-card">
            <div class="l-sec-card-head">
              <span class="l-sec-dot" style="--d:#2f7d6e"></span>
              <span class="l-sec-dot" style="--d:#3a7bd5"></span>
              <span class="l-sec-dot" style="--d:#e8843c"></span>
              <span class="l-sec-card-tag">访问控制 · 模拟</span>
            </div>
            <div class="l-sec-rows">
              <div class="l-sec-row">
                <span class="l-role l-role-t">教师</span>
                <div class="l-sec-bars"><i style="width:100%"></i></div>
                <span class="l-sec-perm">全部数据</span>
              </div>
              <div class="l-sec-row">
                <span class="l-role l-role-s">学生</span>
                <div class="l-sec-bars"><i style="width:62%"></i></div>
                <span class="l-sec-perm">成绩 / 作业</span>
              </div>
              <div class="l-sec-row">
                <span class="l-role l-role-p">家长</span>
                <div class="l-sec-bars"><i style="width:38%"></i></div>
                <span class="l-sec-perm">报告摘要</span>
              </div>
            </div>
            <div class="l-sec-note">心理与情绪数据：仅教师可见</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CTA ===== -->
    <section class="l-cta reveal">
      <div class="l-cta-band">
        <div class="l-glow l-glow-3"></div>
        <h2>成长不该被一张成绩单定义</h2>
        <p>从今天开始，为每个孩子建立一份会生长的档案。</p>
        <button class="l-btn l-btn-white l-btn-lg" @click="goApp">免费进入系统体验 →</button>
      </div>
    </section>

    <!-- ===== Footer ===== -->
    <footer class="l-footer">
      <div class="l-footer-inner">
        <div class="l-footer-brand">
          <a class="l-logo" href="#top" @click.prevent="scrollTo('#top')">
            <span class="l-logo-mark">
              <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="10" fill="#2f7d6e"/>
                <path d="M11 25l6-7 5 4 7-9" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="29" cy="13" r="2.6" fill="#8fd0c0"/>
              </svg>
            </span>
            <span class="l-logo-text">学生成长档案</span>
          </a>
          <p>Student Growth Archive System</p>
        </div>
        <div class="l-footer-links">
          <a href="#features" @click.prevent="scrollTo('#features')">核心功能</a>
          <a href="#method" @click.prevent="scrollTo('#method')">使用方式</a>
          <a href="#security" @click.prevent="scrollTo('#security')">数据安全</a>
        </div>
        <div class="l-footer-meta">
          Powered by Cloudflare Pages · Workers · D1
          <br/>© 2026 Student Growth Archive
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isLoggedIn } from '../api/auth.js'

const router = useRouter()
const scrolled = ref(false)

function goApp() {
  router.push(isLoggedIn() ? '/app' : '/login')
}

function scrollTo(sel) {
  const el = document.querySelector(sel)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth' })
}

let observer = null
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          observer.unobserve(e.target)
        }
      })
    },
    { threshold: 0.12 }
  )
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))

  const onScroll = () => { scrolled.value = window.scrollY > 24 }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
/* ============ 基础 ============ */
.landing {
  --ink: #10332d;
  --ink-2: #2f5750;
  --mut: #5f7a74;
  --line: #e3ece8;
  --brand: #2f7d6e;
  --brand-ink: #1a5c52;
  background: #fbfdfc;
  color: var(--ink);
  font-family: -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  overflow-x: hidden;
}
.l-btn {
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  border-radius: 999px;
  padding: 10px 20px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform .15s ease, box-shadow .2s ease, background .2s ease, color .2s ease;
  text-decoration: none;
}
.l-btn:active { transform: scale(.97); }
.l-btn-solid {
  background: var(--brand);
  color: #fff;
  box-shadow: 0 6px 18px rgba(47,125,110,.28);
}
.l-btn-solid:hover { background: var(--brand-ink); box-shadow: 0 8px 22px rgba(47,125,110,.35); }
.l-btn-ghost {
  background: transparent;
  color: var(--ink-2);
  border: 1.5px solid #cfe0da;
}
.l-btn-ghost:hover { border-color: var(--brand); color: var(--brand); }
.l-btn-lg { padding: 13px 28px; font-size: 16px; }
.l-btn-white {
  background: #fff;
  color: var(--brand-ink);
  box-shadow: 0 10px 30px rgba(0,0,0,.18);
}
.l-btn-white:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(0,0,0,.24); }
.l-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .24em;
  color: var(--brand);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  text-transform: uppercase;
}
.l-eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); box-shadow: 0 0 0 4px rgba(47,125,110,.15); }

/* reveal 动效 */
.reveal { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s cubic-bezier(.2,.7,.3,1); }
.reveal.in { opacity: 1; transform: none; }

/* ============ 导航 ============ */
.l-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(251,253,252,.86);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid transparent;
  transition: border-color .25s, box-shadow .25s;
}
.l-nav.scrolled { border-bottom-color: var(--line); box-shadow: 0 4px 24px rgba(16,51,45,.05); }
.l-nav-inner {
  max-width: 1160px;
  margin: 0 auto;
  padding: 14px 28px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.l-logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
.l-logo-mark { display: flex; }
.l-logo-text { font-size: 17px; font-weight: 700; color: var(--ink); letter-spacing: .01em; }
.l-menu { display: flex; gap: 26px; margin-left: 16px; }
.l-menu a {
  font-size: 14.5px;
  color: var(--mut);
  text-decoration: none;
  font-weight: 500;
  transition: color .2s;
  padding: 4px 0;
}
.l-menu a:hover { color: var(--brand); }
.l-nav-cta { margin-left: auto; display: flex; align-items: center; gap: 14px; }
.l-login-link { font-size: 14.5px; color: var(--ink-2); text-decoration: none; font-weight: 600; }
.l-login-link:hover { color: var(--brand); }

/* ============ HERO ============ */
.l-hero { position: relative; min-height: calc(100vh - 66px); display: flex; flex-direction: column; justify-content: center; }
.l-hero-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.l-grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(47,125,110,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(47,125,110,.05) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 90% 80% at 50% 20%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 90% 80% at 50% 20%, #000 30%, transparent 75%);
}
.l-glow { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .5; }
.l-glow-1 { width: 460px; height: 460px; background: rgba(47,125,110,.14); top: -180px; right: -120px; }
.l-glow-2 { width: 380px; height: 380px; background: rgba(58,123,213,.1); bottom: -160px; left: -140px; }
.l-hero-inner {
  position: relative;
  max-width: 1160px;
  margin: 0 auto;
  padding: 90px 28px 70px;
  display: grid;
  grid-template-columns: 1.02fr .98fr;
  gap: 64px;
  align-items: center;
  width: 100%;
}
.l-title {
  font-size: clamp(38px, 5.2vw, 60px);
  line-height: 1.16;
  font-weight: 800;
  letter-spacing: -.035em;
  margin: 20px 0 18px;
  color: var(--ink);
}
.l-title-accent {
  display: block;
  color: transparent;
  background: linear-gradient(92deg, #1a5c52 10%, #2f7d6e 55%, #3a7bd5 110%);
  -webkit-background-clip: text;
  background-clip: text;
}
.l-sub {
  font-size: 17px;
  line-height: 1.75;
  color: var(--mut);
  max-width: 30em;
  margin-bottom: 34px;
}
.l-cta-row { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 34px; }
.l-hero-meta {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  font-size: 13.5px; color: var(--mut);
}
.l-meta-sep { color: #c2d5ce; }

/* Hero 面板 */
.l-hero-visual { position: relative; }
.l-panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 22px 24px 16px;
  box-shadow: 0 30px 70px -22px rgba(16,51,45,.22), 0 8px 24px -12px rgba(16,51,45,.12);
  position: relative;
  z-index: 2;
  animation: panelIn .9s cubic-bezier(.2,.8,.25,1) both;
}
@keyframes panelIn {
  from { opacity: 0; transform: translateY(34px) scale(.985); }
  to { opacity: 1; transform: none; }
}
.l-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.l-panel-title { display: flex; align-items: center; gap: 11px; }
.l-panel-avatar {
  width: 40px; height: 40px; border-radius: 12px;
  background: linear-gradient(135deg, #2f7d6e, #3a7bd5);
  color: #fff; font-weight: 700; font-size: 17px;
  display: flex; align-items: center; justify-content: center;
}
.l-panel-name { font-size: 14.5px; font-weight: 700; color: var(--ink); }
.l-panel-sub { font-size: 12px; color: var(--mut); margin-top: 1px; }
.l-trend-chip {
  font-size: 12px; font-weight: 600; color: var(--brand);
  background: #e6f4f1; padding: 5px 12px; border-radius: 999px;
}
.l-chart svg { width: 100%; height: auto; display: block; }
.l-chart-line { stroke-dasharray: 620; stroke-dashoffset: 620; animation: drawLine 1.8s cubic-bezier(.6,.1,.2,1) .35s forwards; }
@keyframes drawLine { to { stroke-dashoffset: 0; } }
.l-chart-live { animation: dotBlink 1.6s ease-in-out infinite; transform-origin: 350px 52px; }
@keyframes dotBlink { 0%,100% { r: 5 } 50% { r: 7 } }
.l-chart-pulse { animation: pulseRing 1.8s ease-out infinite; }
@keyframes pulseRing {
  0% { transform: scale(1); opacity: .7; }
  70%, 100% { transform: scale(3.2); opacity: 0; }
}
.l-panel-axis {
  display: flex; justify-content: space-between;
  font-size: 11.5px; color: var(--mut); padding: 8px 6px 0;
  border-top: 1px dashed #e7efec; margin-top: 6px;
}

/* 浮动卡片 */
.l-float {
  position: absolute;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 16px 40px -14px rgba(16,51,45,.25);
  padding: 12px 16px;
  display: flex; align-items: center; gap: 11px;
  z-index: 3;
  animation: floatY 5.5s ease-in-out infinite;
}
.l-float-1 { top: -26px; left: -34px; animation-delay: .6s; }
.l-float-2 { bottom: -30px; right: -24px; animation-delay: 1.8s; }
@keyframes floatY {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-9px); }
}
.l-float-icon {
  width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; background: #eef6f3;
}
.l-float-icon.ai { background: #efecfa; }
.l-float-k { font-size: 11px; color: var(--mut); }
.l-float-v { font-size: 15px; font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums; }
.l-float-v em { font-style: normal; font-size: 11px; color: var(--brand); font-weight: 700; margin-left: 2px; }
.l-float-v2 { font-size: 12.5px; color: var(--ink-2); max-width: 15em; line-height: 1.4; }

.l-hero-scroll {
  position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--mut); cursor: pointer; letter-spacing: .08em;
}
.l-hero-scroll:hover { color: var(--brand); }

/* ============ 指标条 ============ */
.l-stats { border-block: 1px solid var(--line); background: #fff; }
.l-stats-inner {
  max-width: 1160px; margin: 0 auto; padding: 40px 28px;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
}
.l-stat { text-align: center; padding: 8px 12px; }
.l-stat-num {
  font-size: clamp(30px, 3.4vw, 42px);
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}
.l-stat-num span { font-size: .55em; font-weight: 700; color: var(--brand); margin-left: 2px; }
.l-stat-label { font-size: 13.5px; color: var(--mut); margin-top: 6px; }

/* ============ Section 通用 ============ */
.l-section { padding: 96px 0; }
.l-section-tint { background: #f2f8f5; }
.l-section-head { max-width: 640px; margin: 0 auto 54px; text-align: center; display: flex; flex-direction: column; align-items: center; }
.l-h2 {
  font-size: clamp(28px, 3.4vw, 40px);
  font-weight: 800;
  letter-spacing: -.03em;
  margin: 18px 0 12px;
  color: var(--ink);
}
.l-desc { font-size: 16px; color: var(--mut); line-height: 1.7; max-width: 34em; }

/* ============ 功能卡 ============ */
.l-feat-grid {
  max-width: 1160px; margin: 0 auto; padding: 0 28px;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px;
}
.l-feat {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 30px 26px;
  transition: transform .25s ease, box-shadow .3s ease, border-color .3s ease;
}
.l-feat:hover { transform: translateY(-5px); box-shadow: 0 22px 44px -18px rgba(16,51,45,.18); border-color: #cfe6de; }
.l-feat-icon {
  width: 50px; height: 50px; border-radius: 14px;
  background: var(--ic-bg); color: var(--ic);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
}
.l-feat h3 { font-size: 17.5px; font-weight: 700; margin-bottom: 10px; color: var(--ink); }
.l-feat p { font-size: 14px; line-height: 1.7; color: var(--mut); }

/* ============ 步骤 ============ */
.l-steps {
  max-width: 1160px; margin: 0 auto; padding: 0 28px;
  display: flex; align-items: flex-start; justify-content: center; gap: 12px;
}
.l-step {
  flex: 1; max-width: 300px;
  background: #fff; border: 1px solid var(--line); border-radius: 18px;
  padding: 30px 28px; position: relative;
}
.l-step-num {
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 13px; font-weight: 700; color: var(--brand);
  letter-spacing: .1em;
  margin-bottom: 16px;
  display: inline-flex; align-items: center; gap: 8px;
}
.l-step-num::after { content: ''; width: 34px; height: 1.5px; background: var(--brand); opacity: .4; }
.l-step h3 { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--ink); }
.l-step p { font-size: 14px; line-height: 1.7; color: var(--mut); }
.l-step-arrow { align-self: center; color: var(--brand); opacity: .55; flex-shrink: 0; }

/* ============ 安全 ============ */
.l-sec-grid {
  max-width: 1160px; margin: 0 auto; padding: 0 28px;
  display: grid; grid-template-columns: 1.05fr .95fr; gap: 70px; align-items: center;
}
.l-sec-list { list-style: none; margin-top: 28px; display: flex; flex-direction: column; gap: 20px; }
.l-sec-list li { display: flex; gap: 14px; align-items: flex-start; }
.l-check {
  flex-shrink: 0;
  width: 24px; height: 24px; border-radius: 50%;
  background: #e6f4f1; color: var(--brand);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; margin-top: 1px;
}
.l-sec-list strong { font-weight: 700; color: var(--ink); display: block; margin-bottom: 2px; font-size: 15px; }
.l-sec-list li div { font-size: 14px; color: var(--mut); line-height: 1.6; }

.l-sec-visual { display: flex; justify-content: center; }
.l-sec-card {
  width: 100%; max-width: 420px;
  background: #10211d;
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0 30px 60px -20px rgba(10,30,25,.5);
  color: #fff;
}
.l-sec-card-head { display: flex; align-items: center; gap: 7px; margin-bottom: 22px; }
.l-sec-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--d); opacity: .85; }
.l-sec-card-tag {
  margin-left: auto; font-size: 11px; color: rgba(255,255,255,.5);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace; letter-spacing: .08em;
}
.l-sec-rows { display: flex; flex-direction: column; gap: 16px; }
.l-sec-row { display: grid; grid-template-columns: 46px 1fr 74px; align-items: center; gap: 12px; }
.l-role {
  font-size: 12px; font-weight: 700; padding: 4px 0; text-align: center;
  border-radius: 8px; letter-spacing: .02em;
}
.l-role-t { background: rgba(58,123,213,.22); color: #9cc0f2; }
.l-role-s { background: rgba(47,125,110,.25); color: #8fd0c0; }
.l-role-p { background: rgba(232,132,60,.2); color: #f2b183; }
.l-sec-bars { height: 8px; background: rgba(255,255,255,.08); border-radius: 99px; overflow: hidden; }
.l-sec-bars i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #2f7d6e, #3a7bd5); }
.l-sec-row:nth-child(2) .l-sec-bars i { background: #3a7bd5; }
.l-sec-row:nth-child(3) .l-sec-bars i { background: linear-gradient(90deg, #e8843c, #f0b429); }
.l-sec-perm { font-size: 12px; color: rgba(255,255,255,.65); text-align: right; }
.l-sec-note {
  margin-top: 22px; padding: 12px 14px;
  background: rgba(255,255,255,.06);
  border: 1px dashed rgba(255,255,255,.16);
  border-radius: 10px;
  font-size: 12.5px; color: rgba(255,255,255,.7);
}

/* ============ CTA ============ */
.l-cta { padding: 30px 28px 100px; max-width: 1160px; margin: 0 auto; }
.l-cta-band {
  position: relative;
  background: linear-gradient(120deg, #12453d 0%, #1a5c52 45%, #2f7d6e 100%);
  border-radius: 26px;
  padding: 72px 40px;
  text-align: center;
  color: #fff;
  overflow: hidden;
}
.l-cta-band h2 { font-size: clamp(26px, 3.2vw, 38px); font-weight: 800; letter-spacing: -.02em; position: relative; }
.l-cta-band p { margin: 14px auto 30px; color: rgba(255,255,255,.75); font-size: 16px; position: relative; }
.l-cta-band .l-btn { position: relative; }
.l-glow-3 {
  width: 420px; height: 420px; background: rgba(138,208,192,.2);
  top: -220px; left: 50%; transform: translateX(-50%);
}

/* ============ Footer ============ */
.l-footer { border-top: 1px solid var(--line); background: #fff; }
.l-footer-inner {
  max-width: 1160px; margin: 0 auto; padding: 40px 28px;
  display: flex; align-items: center; gap: 40px; flex-wrap: wrap;
}
.l-footer-brand p { font-size: 12px; color: var(--mut); margin-top: 4px; letter-spacing: .06em; }
.l-footer-links { display: flex; gap: 24px; }
.l-footer-links a { font-size: 14px; color: var(--mut); text-decoration: none; }
.l-footer-links a:hover { color: var(--brand); }
.l-footer-meta { margin-left: auto; text-align: right; font-size: 12px; color: var(--mut); line-height: 1.8; }

/* ============ 响应式 ============ */
@media (max-width: 1024px) {
  .l-feat-grid { grid-template-columns: repeat(2, 1fr); }
  .l-hero-inner { gap: 44px; }
  .l-stats-inner { grid-template-columns: repeat(2, 1fr); gap: 26px; }
  .l-sec-grid { gap: 46px; }
}
@media (max-width: 900px) {
  .l-hero-inner { grid-template-columns: 1fr; padding-top: 64px; }
  .l-hero-visual { max-width: 560px; margin: 0 auto; width: 100%; }
  .l-hero { min-height: auto; }
  .l-float-1 { left: -6px; }
  .l-float-2 { right: -6px; }
  .l-menu { display: none; }
  .l-sec-grid { grid-template-columns: 1fr; }
  .l-steps { flex-direction: column; align-items: center; }
  .l-step-arrow { transform: rotate(90deg); }
  .l-footer-meta { margin-left: 0; text-align: left; }
}
@media (max-width: 640px) {
  .l-feat-grid { grid-template-columns: 1fr; }
  .l-stats-inner { grid-template-columns: 1fr 1fr; gap: 20px; padding: 30px 20px; }
  .l-section { padding: 68px 0; }
  .l-cta-band { padding: 54px 24px; }
  .l-nav-inner { padding: 12px 18px; }
  .l-hero-inner { padding: 56px 18px 60px; }
  .l-login-link { display: none; }
  .l-hero-meta { font-size: 12.5px; }
  .l-float-1 { top: -20px; }
  .l-float-2 { bottom: -22px; }
  .l-hero-scroll { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
  .l-chart-line, .l-panel { animation: none; }
  .l-float, .l-chart-live, .l-chart-pulse { animation: none; }
}
</style>
