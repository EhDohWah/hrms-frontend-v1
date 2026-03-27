<template>
  <div class="record-card" :class="org ? `theme-${org.theme || 'smru'}` : 'theme-default'">
    <!-- Header -->
    <div class="record-header">
      <div v-if="org" class="header-top">
        <div class="org-identity">
          <div class="org-logo">{{ org.short }}</div>
          <div class="org-info">
            <h2>{{ org.name }}</h2>
            <small>{{ org.subtitle }}</small>
          </div>
        </div>
        <div v-if="refId" class="header-ref">
          <span class="ref-id">{{ refId }}</span>
        </div>
      </div>
      <div class="header-title-row" :class="{ 'no-org': !org }">
        <div>
          <h1>{{ title }}</h1>
          <div v-if="!org && refId" class="header-ref-inline">
            <span class="ref-id">{{ refId }}</span>
          </div>
        </div>
        <span class="module-badge"><i :class="`ti ti-${icon}`" style="margin-right:4px"></i>{{ badge }}</span>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
      <span class="status-badge" :class="`status-${status}`">
        <span class="dot"></span>{{ statusLabel }}
      </span>
      <span v-for="(meta, i) in statusMeta" :key="i" class="status-meta">
        <i :class="`ti ti-${meta.icon}`"></i> {{ meta.text }}
      </span>
    </div>

    <!-- Body -->
    <div class="record-body">
      <div v-for="(section, si) in sections" :key="si" class="record-section">
        <div class="section-title">
          <i v-if="section.icon" :class="`ti ti-${section.icon}`"></i> {{ section.title }}
        </div>

        <!-- Type: fields -->
        <div v-if="section.type === 'fields'" class="field-grid">
          <div
            v-for="(field, fi) in section.fields"
            :key="fi"
            class="field-row"
            :class="{ 'full-width': field.fullWidth }"
          >
            <span class="field-label">{{ field.label }}</span>
            <span class="field-value" :class="{ mono: field.mono, muted: field.muted }">
              {{ field.value ?? '—' }}
            </span>
          </div>
        </div>

        <!-- Type: table -->
        <table v-else-if="section.type === 'table'" class="record-table">
          <thead>
            <tr>
              <th
                v-for="(header, hi) in section.headers"
                :key="hi"
                :class="getHeaderAlign(section, hi)"
              >{{ header }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in section.rows" :key="ri">
              <td
                v-for="(cell, ci) in row"
                :key="ci"
                :class="getCellAlign(section, ci)"
              >{{ cell }}</td>
            </tr>
            <tr v-if="section.summary" class="summary-row">
              <td :colspan="section.summary.colspan || (section.headers.length - 2)" class="text-right summary-label">
                {{ section.summary.label }}
              </td>
              <td
                v-for="(val, vi) in section.summary.values"
                :key="vi"
                :class="getCellAlign(section, (section.headers.length - section.summary.values.length) + vi)"
              >{{ val }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Type: notes -->
        <div v-else-if="section.type === 'notes'" class="notes-block" :class="{ empty: !section.content }">
          {{ section.content || 'No notes available.' }}
        </div>

        <!-- Type: approval -->
        <div v-else-if="section.type === 'approval'" class="approval-timeline">
          <div v-for="(step, ai) in section.steps" :key="ai" class="approval-step">
            <div class="step-dot" :class="step.approved ? 'approved' : 'pending'"></div>
            <div class="approval-step-content">
              <h5>{{ step.label }}</h5>
              <p>{{ step.name }}</p>
              <span v-if="step.date" class="approval-date">{{ step.date }}</span>
            </div>
          </div>
        </div>

        <!-- Type: avatar_fields -->
        <template v-else-if="section.type === 'avatar_fields'">
          <div class="avatar-header">
            <div class="avatar-circle">{{ section.initials }}</div>
            <div class="avatar-info">
              <h3>{{ section.name }}</h3>
              <p v-if="section.subtitle">{{ section.subtitle }}</p>
            </div>
          </div>
          <div class="field-grid">
            <div
              v-for="(field, fi) in section.fields"
              :key="fi"
              class="field-row"
              :class="{ 'full-width': field.fullWidth }"
            >
              <span class="field-label">{{ field.label }}</span>
              <span class="field-value" :class="{ mono: field.mono, muted: field.muted }">
                {{ field.value ?? '—' }}
              </span>
            </div>
          </div>
        </template>

        <!-- Type: timeline -->
        <div v-else-if="section.type === 'timeline'" class="emp-timeline">
          <div
            v-for="(event, ei) in section.events"
            :key="ei"
            class="timeline-event"
            :class="event.status || 'past'"
          >
            <div class="tl-dot"></div>
            <div class="tl-date">{{ event.date }}</div>
            <div class="tl-title">{{ event.title }}</div>
            <div v-if="event.detail" class="tl-detail">{{ event.detail }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="record-footer">
      <div class="footer-left">
        <span class="hrms-mark">HRMS</span>
        <span class="separator"></span>
        <span>Generated on {{ generatedDate }}</span>
        <template v-if="org">
          <span class="separator"></span>
          <span>{{ org.name }}</span>
        </template>
      </div>
      <div class="footer-right">
        <button class="footer-btn" @click="$emit('print')">
          <i class="ti ti-printer"></i> Print
        </button>
        <button class="footer-btn" @click="$emit('edit')">
          <i class="ti ti-pencil"></i> Edit
        </button>
        <button
          v-for="(action, ai) in footerActions"
          :key="ai"
          class="footer-btn"
          @click="action.handler"
        >
          <i :class="`ti ti-${action.icon}`"></i> {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDateTime } from '@/utils/formatters'

defineProps({
  org: { type: Object, default: null },
  title: { type: String, required: true },
  refId: { type: String, default: '' },
  icon: { type: String, default: 'file-text' },
  badge: { type: String, default: 'Record' },
  status: { type: String, default: 'active' },
  statusLabel: { type: String, default: 'Active' },
  statusMeta: { type: Array, default: () => [] },
  sections: { type: Array, required: true },
  footerActions: { type: Array, default: () => [] },
})

defineEmits(['print', 'edit'])

const generatedDate = formatDateTime(new Date())

function getHeaderAlign(section, index) {
  return section.aligns?.[index] || ''
}

function getCellAlign(section, index) {
  const align = section.aligns?.[index]
  const mono = section.monoCols?.includes(index)
  const classes = []
  if (align) classes.push(align)
  if (mono) classes.push('table-mono')
  return classes.join(' ')
}
</script>

<style scoped>

/* ── Organization Theme Variables ── */
.record-card {
  --smru-primary: #002147;
  --smru-secondary: #0d3a6e;
  --smru-accent: #1a5296;
  --smru-light: #e6edf5;
  --smru-stripe: #f0f4f9;

  --bhf-primary: #3157A5;
  --bhf-secondary: #4a71b8;
  --bhf-accent: #6389c7;
  --bhf-light: #eaf0f8;
  --bhf-stripe: #f2f6fb;

  --org-primary: var(--smru-primary);
  --org-secondary: var(--smru-secondary);
  --org-accent: var(--smru-accent);
  --org-light: var(--smru-light);
  --org-stripe: var(--smru-stripe);

  --bg-page: #f4f5f6;
  --bg-card: #ffffff;
  --bg-section: #f8f9fb;
  --rv-text-primary: #1c2433;
  --rv-text-secondary: #556274;
  --rv-text-muted: #8d99ab;
  --rv-text-label: #6b7a8d;
  --rv-border: #e0e5ec;
  --rv-border-strong: #c8d0db;

  --status-active: #16a34a;
  --status-active-bg: #f0fdf4;
  --status-ending-soon: #d97706;
  --status-ending-soon-bg: #fffbeb;
  --status-expired: #dc2626;
  --status-expired-bg: #fef2f2;

  --font-display: 'Source Serif 4', Georgia, serif;
  --font-body: 'DM Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --rv-radius: 10px;
  --rv-radius-sm: 6px;
  --rv-shadow-card: 0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.1);
  --rv-transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-default {
  --org-primary: #002147;
  --org-secondary: #0d3a6e;
  --org-accent: #1a5296;
  --org-light: #e6edf5;
  --org-stripe: #f0f4f9;
}
.theme-bhf {
  --org-primary: var(--bhf-primary);
  --org-secondary: var(--bhf-secondary);
  --org-accent: var(--bhf-accent);
  --org-light: var(--bhf-light);
  --org-stripe: var(--bhf-stripe);
}
.theme-smru {
  --org-primary: var(--smru-primary);
  --org-secondary: var(--smru-secondary);
  --org-accent: var(--smru-accent);
  --org-light: var(--smru-light);
  --org-stripe: var(--smru-stripe);
}

/* ══════════════════════════════════════════════
   RECORD CARD
══════════════════════════════════════════════ */
.record-card {
  max-width: 880px;
  margin: 0 auto;
  background: var(--bg-card);
  border-radius: var(--rv-radius);
  box-shadow: var(--rv-shadow-card);
  overflow: hidden;
  font-family: var(--font-body);
  color: var(--rv-text-primary);
  line-height: 1.6;
}

@media (prefers-reduced-motion: no-preference) {
  .record-card { animation: cardEnter 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
  .record-section { animation: sectionReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
  .record-section:nth-child(1) { animation-delay: 0.08s; }
  .record-section:nth-child(2) { animation-delay: 0.16s; }
  .record-section:nth-child(3) { animation-delay: 0.24s; }
  .record-section:nth-child(4) { animation-delay: 0.32s; }
}
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(10px) scale(0.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes sectionReveal {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Organization Header ── */
.record-header {
  background: var(--org-primary);
  color: #fff;
  position: relative;
  overflow: hidden;
}
.record-header::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -8%;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  pointer-events: none;
}
.record-header::after {
  content: '';
  position: absolute;
  bottom: -60%;
  left: 15%;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: rgba(255,255,255,0.03);
  pointer-events: none;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 28px 0;
  position: relative;
  z-index: 1;
}
.org-identity {
  display: flex;
  align-items: center;
  gap: 14px;
}
.org-logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.1);
}
.org-info h2 {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin: 0;
}
.org-info small {
  font-size: 0.72rem;
  font-weight: 400;
  opacity: 0.7;
  letter-spacing: 0.02em;
}
.header-ref {
  margin-right: 36px;
}
.header-ref .ref-id {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 500;
  background: rgba(255,255,255,0.12);
  padding: 4px 12px;
  border-radius: 99px;
  letter-spacing: 0.03em;
}

.header-title-row {
  padding: 14px 28px 18px;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.header-title-row h1 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin: 0;
}
.header-title-row .module-badge {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(255,255,255,0.15);
  padding: 5px 14px;
  border-radius: 99px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 36px;
}

/* No-org header: title row gets more padding since there's no org row above */
.header-title-row.no-org {
  padding: 22px 28px 20px;
}
.header-ref-inline {
  margin-top: 4px;
}
.header-ref-inline .ref-id {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 500;
  background: rgba(255,255,255,0.12);
  padding: 3px 10px;
  border-radius: 99px;
  letter-spacing: 0.03em;
}

/* ── Status Bar ── */
.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 11px 28px;
  background: var(--org-light);
  border-bottom: 1px solid var(--rv-border);
  flex-wrap: wrap;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 14px;
  border-radius: 99px;
  font-size: 0.76rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.status-badge .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  position: relative;
}
.status-active { color: var(--status-active); background: var(--status-active-bg); }
.status-ending-soon { color: var(--status-ending-soon); background: var(--status-ending-soon-bg); }
.status-expired { color: var(--status-expired); background: var(--status-expired-bg); }

/* Pulse animation for active status dot */
@media (prefers-reduced-motion: no-preference) {
  .status-active .dot::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1.5px solid var(--status-active);
    animation: statusPulse 2s ease-in-out infinite;
  }
}
@keyframes statusPulse {
  0%, 100% { opacity: 0; transform: scale(0.8); }
  50% { opacity: 0.6; transform: scale(1.4); }
}

.status-meta {
  font-size: 0.78rem;
  color: var(--rv-text-muted);
  display: flex;
  align-items: center;
  gap: 5px;
}
.status-meta i { font-size: 0.88rem; }

/* ── Content Body ── */
.record-body { padding: 24px 28px; }

/* ── Section ── */
.record-section { margin-bottom: 28px; }
.record-section:last-child { margin-bottom: 0; }

.section-title {
  font-family: var(--font-display);
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--org-primary);
  letter-spacing: -0.01em;
  padding-bottom: 8px;
  margin-bottom: 14px;
  border-bottom: 2px solid var(--org-light);
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
/* Accent underline on section title */
.section-title::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 40px;
  height: 2px;
  background: var(--org-primary);
  border-radius: 1px;
}
.section-title i { font-size: 1.05rem; opacity: 0.65; }

/* ── Section Type: fields ── */
.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: 1px solid #eef0f4;
  border-radius: var(--rv-radius-sm);
  overflow: hidden;
}
.field-row {
  display: flex;
  align-items: baseline;
  padding: 9px 14px;
  border-bottom: 1px solid #eef0f4;
  transition: background var(--rv-transition);
}
.field-row:hover { background: var(--org-stripe); }
.field-row:nth-child(odd) { border-right: 1px solid #eef0f4; }
.field-row.full-width {
  grid-column: 1 / -1;
  border-right: none;
}
/* Remove bottom border from last row(s) */
.field-grid > .field-row:last-child,
.field-grid > .field-row:nth-last-child(2):nth-child(odd) {
  border-bottom: none;
}
.field-label {
  flex: 0 0 140px;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--rv-text-label);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.6;
}
.field-value {
  flex: 1;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--rv-text-primary);
  word-break: break-word;
}
.field-value.mono { font-family: var(--font-mono); font-size: 0.83rem; }
.field-value.muted { color: var(--rv-text-muted); font-style: italic; font-weight: 400; }

/* ── Section Type: table ── */
.record-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
  border: 1px solid #eef0f4;
  border-radius: var(--rv-radius-sm);
  overflow: hidden;
}
.record-table thead th {
  background: var(--org-light);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--org-primary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 10px 14px;
  text-align: left;
  border-bottom: 2px solid var(--rv-border);
}
.record-table tbody td {
  padding: 10px 14px;
  border-bottom: 1px solid #eef0f4;
  color: var(--rv-text-primary);
  font-weight: 500;
}
.record-table tbody tr { transition: background var(--rv-transition); }
.record-table tbody tr:hover { background: var(--org-stripe); }
.record-table tbody tr:nth-child(even) { background: #fbfcfd; }
.record-table tbody tr:nth-child(even):hover { background: var(--org-stripe); }
.record-table tbody tr:last-child td { border-bottom: none; }
.record-table .text-right { text-align: right; }
.record-table .text-center { text-align: center; }
.record-table .table-mono { font-family: var(--font-mono); font-size: 0.82rem; }
.record-table .summary-row {
  background: var(--org-light) !important;
  font-weight: 700;
  border-top: 2px solid var(--rv-border);
}
.record-table .summary-row td { border-bottom: none; color: var(--org-primary); }
.record-table .summary-label {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--rv-text-label);
}

/* ── Section Type: notes ── */
.notes-block {
  background: var(--bg-section);
  border: 1px solid var(--rv-border);
  border-radius: var(--rv-radius-sm);
  padding: 14px 16px;
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--rv-text-secondary);
  white-space: pre-wrap;
}
.notes-block.empty { color: var(--rv-text-muted); font-style: italic; }

/* ── Section Type: approval ── */
.approval-timeline {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 24px;
}
.approval-timeline::before {
  content: '';
  position: absolute;
  left: 7px; top: 8px; bottom: 8px;
  width: 2px;
  background: linear-gradient(to bottom, var(--rv-border) 0%, var(--org-light) 100%);
}
.approval-step {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 10px 0;
  position: relative;
}
.approval-step .step-dot {
  position: absolute;
  left: -20px; top: 14px;
  width: 16px; height: 16px;
  border-radius: 50%;
  border: 2.5px solid var(--rv-border);
  background: var(--bg-card);
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.approval-step .step-dot.approved {
  border-color: var(--status-active);
  background: var(--status-active);
  box-shadow: 0 0 0 3px var(--status-active-bg);
}
.approval-step .step-dot.approved::after { content: ''; width: 5px; height: 5px; background: #fff; border-radius: 50%; }
.approval-step .step-dot.pending {
  border-color: var(--status-ending-soon);
  background: var(--status-ending-soon-bg);
  box-shadow: 0 0 0 3px var(--status-ending-soon-bg);
}
.approval-step-content h5 { font-size: 0.86rem; font-weight: 600; color: var(--rv-text-primary); margin: 0 0 2px; }
.approval-step-content p { font-size: 0.78rem; color: var(--rv-text-muted); margin: 0; }
.approval-step-content .approval-date {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  color: var(--rv-text-secondary);
  background: var(--bg-section);
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-top: 3px;
}

/* ── Section Type: avatar_fields ── */
.avatar-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 14px;
  margin-bottom: 4px;
  background: linear-gradient(135deg, var(--org-light) 0%, var(--bg-section) 100%);
  border-radius: var(--rv-radius-sm);
  border: 1px solid var(--rv-border);
}
.avatar-circle {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--org-primary) 0%, var(--org-secondary) 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 3px 12px rgba(0,0,0,0.15);
}
.avatar-info h3 {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--rv-text-primary);
  line-height: 1.3;
  margin: 0;
}
.avatar-info p { font-size: 0.84rem; color: var(--rv-text-secondary); margin: 2px 0 0; }

/* ── Section Type: timeline ── */
.emp-timeline { position: relative; padding-left: 28px; }
.emp-timeline::before {
  content: ''; position: absolute; left: 8px; top: 8px; bottom: 8px; width: 2px;
  background: linear-gradient(to bottom, var(--rv-border) 0%, var(--org-light) 100%);
}
.timeline-event { position: relative; padding: 10px 0 14px; }
.timeline-event:last-child { padding-bottom: 0; }
.timeline-event .tl-dot {
  position: absolute; left: -24px; top: 14px;
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 2.5px solid var(--rv-border);
  background: var(--bg-card);
  z-index: 1;
  transition: all 0.3s ease;
}
.timeline-event.current .tl-dot {
  border-color: var(--org-secondary);
  background: var(--org-secondary);
  box-shadow: 0 0 0 4px var(--org-light);
}
.timeline-event.current .tl-dot::after {
  content: ''; width: 5px; height: 5px; background: #fff; border-radius: 50%;
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
}
.timeline-event .tl-date { font-family: var(--font-mono); font-size: 0.74rem; font-weight: 500; color: var(--rv-text-muted); margin-bottom: 2px; }
.timeline-event .tl-title { font-size: 0.88rem; font-weight: 600; color: var(--rv-text-primary); margin-bottom: 2px; }
.timeline-event.current .tl-title { color: var(--org-primary); }
.timeline-event .tl-detail { font-size: 0.78rem; color: var(--rv-text-secondary); line-height: 1.5; }

/* ── Footer ── */
.record-footer {
  padding: 14px 28px;
  border-top: 1px solid var(--rv-border);
  background: var(--bg-section);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}
.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  color: var(--rv-text-muted);
  letter-spacing: 0.02em;
}
.footer-left .hrms-mark {
  font-weight: 700;
  color: var(--org-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.7rem;
}
.footer-left .separator { width: 1px; height: 12px; background: var(--rv-border-strong); }
.footer-right { display: flex; gap: 6px; }
.footer-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: var(--rv-radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  font-family: var(--font-body);
  border: 1.5px solid var(--rv-border);
  background: var(--bg-card);
  color: var(--rv-text-secondary);
  cursor: pointer;
  transition: all var(--rv-transition);
}
.footer-btn:hover {
  border-color: var(--org-secondary);
  color: var(--org-primary);
  background: var(--org-light);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}
.footer-btn:active { transform: translateY(0); box-shadow: none; }
.footer-btn:focus-visible { outline: 2px solid var(--org-accent); outline-offset: 2px; }
.footer-btn i { font-size: 0.9rem; }

/* ── Print ── */
@media print {
  .record-card { box-shadow: none; border-radius: 0; max-width: 100%; }
  .footer-right { display: none; }
  .record-footer { background: transparent; }
  .field-row:hover, .record-table tbody tr:hover { background: transparent !important; }
  .record-section { animation: none !important; }
}

/* ── Mobile ── */
@media (max-width: 700px) {
  .record-header, .status-bar, .record-body, .record-footer { padding-left: 16px; padding-right: 16px; }
  .field-grid { grid-template-columns: 1fr; }
  .field-row { border-right: none !important; }
  .header-title-row h1 { font-size: 1.2rem; }
  .header-title-row { flex-direction: column; align-items: flex-start; }
  .header-top { flex-direction: column; gap: 10px; align-items: flex-start; }
  .footer-left { flex-wrap: wrap; }
}
</style>
