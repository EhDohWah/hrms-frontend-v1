<template>
  <div class="auth-layout">
    <div class="auth-layout__card">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-layout, #f5f5f5);
}
.auth-layout__card {
  width: 100%;
  max-width: 480px;
  padding: 24px;
}
</style>
