<template>
  <div>
    <header class="topbar">
      <span style="font-size:22px">📚</span>
      <h1>学生成长档案</h1>
      <span class="spacer"></span>
      <router-link to="/">班级概览</router-link>
    </header>
    <main class="container">
      <router-view />
    </main>
  </div>
</template>

<script setup></script>
