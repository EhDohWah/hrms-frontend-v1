<script setup>
defineProps({
  errors: { type: Object, default: () => ({}) },
})
</script>

<template>
  <a-alert
    v-if="Object.keys(errors).length > 0"
    type="error"
    show-icon
    class="form-errors"
  >
    <template #message>
      <div>Please fix the following errors:</div>
    </template>
    <template #description>
      <ul class="form-errors__list">
        <li v-for="(messages, field) in errors" :key="field">
          {{ messages[0] }}
        </li>
      </ul>
    </template>
  </a-alert>
</template>

<style scoped>
.form-errors { margin-bottom: 16px; }
.form-errors__list { margin: 4px 0 0; padding-left: 20px; }
</style>
