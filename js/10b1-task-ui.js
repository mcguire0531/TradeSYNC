'use strict';

renderTradeRows = function renderTradeRowsWithIndependentStatus(trades) {
  return trades.map((trade) => `
    <tr class="trade-row--interactive" data-action="open-trade-tasks" data-trade="${escapeHtml(trade.name)}">
      <td>
        <button class="trade-cell trade-cell--button" type="button" data-action="open-trade-tasks" data-trade="${escapeHtml(trade.name)}">
          ${tradeIcon(trade.name)}
          <span><span class="strong trade-link-label">${escapeHtml(trade.name)}</span><span class="small muted trade-task-count">${trade.complete} / ${trade.total} tasks</span>${renderTradeClashBadge(trade)}</span>
        </button>
      </td>
      <td><div class="status-line">${statusIcon(trade.status)}${tradeStatusCopy(trade)}</div></td>
      <td>${trade.status === 'in-progress'
        ? `<div class="inline-progress"><strong>${trade.percent}%</strong>${makeProgress(trade.percent, 'var(--orange)')}</div>`
        : `<strong>${trade.percent}%</strong>`}</td>
      <td>${trade.lastUpdated ? formatDate(trade.lastUpdated) : '—'}</td>
      <td>
        <div class="trade-actions">
          ${renderTradeTaskOpenButton(trade.name)}
          ${trade.status === 'complete'
            ? `<button class="button button--secondary button--small" type="button" data-action="reopen-trade" data-trade="${escapeHtml(trade.name)}">Reopen</button>`
            : `<button class="button button--primary button--small" type="button" data-action="complete-trade" data-trade="${escapeHtml(trade.name)}">Mark Complete</button>`}
        </div>
      </td>
    </tr>`).join('');
};

renderTradeCards = function renderTradeCardsWithIndependentStatus(trades) {
  return trades.map((trade) => `
    <article class="mobile-row-card trade-mobile-card" data-action="open-trade-tasks" data-trade="${escapeHtml(trade.name)}">
      <div class="mobile-row-card__head">
        <button class="trade-cell trade-cell--button" type="button" data-action="open-trade-tasks" data-trade="${escapeHtml(trade.name)}">
          ${tradeIcon(trade.name)}
          <span><strong class="trade-link-label">${escapeHtml(trade.name)}</strong><span class="small muted trade-task-count">${trade.complete} / ${trade.total} tasks</span>${renderTradeClashBadge(trade)}</span>
        </button>
        <div class="trade-mobile-card__progress"><strong>${trade.percent}%</strong>${renderTradeTaskOpenButton(trade.name, true)}</div>
      </div>
      <div class="mobile-row-card__body"><div class="status-line">${statusIcon(trade.status)}${tradeStatusCopy(trade)}</div>${trade.status === 'in-progress' ? makeProgress(trade.percent, 'var(--orange)') : ''}</div>
      <div class="mobile-row-card__foot">
        <span class="small muted">Updated ${trade.lastUpdated ? formatDate(trade.lastUpdated) : '—'}</span>
        ${trade.status === 'complete'
          ? `<button class="button button--secondary button--small" type="button" data-action="reopen-trade" data-trade="${escapeHtml(trade.name)}">Reopen</button>`
          : `<button class="button button--primary button--small" type="button" data-action="complete-trade" data-trade="${escapeHtml(trade.name)}">Mark Complete</button>`}
      </div>
    </article>`).join('');
};

renderTaskTable = function renderTaskTableWithClashesAndComments(tasks) {
  const rows = tasks.map((task) => `
    <tr class="${taskHasStatusClash(task) ? 'task-row--clash' : ''}">
      <td><div class="task-title"><div class="task-title__name">${escapeHtml(task.title)} ${renderTaskClashBadge(task, true)}</div><div class="task-title__description">${escapeHtml(task.description)}</div></div></td>
      <td><div class="trade-cell">${tradeIcon(task.trade)}<span>${escapeHtml(task.trade)}</span></div></td>
      <td>${taskStatusSelect(task)}</td>
      <td>${escapeHtml(task.assignee)}</td>
      <td>${formatDate(task.dueDate)}</td>
      <td>${renderTaskCommentButton(task)}</td>
    </tr>`).join('');
  return `<div class="table-wrap table-wrap--responsive"><table class="data-table"><thead><tr><th>Task</th><th>Trade</th><th>${escapeHtml(taskInterfaceLabel())} Status</th><th>Assignee</th><th>Due Date</th><th>Comments</th></tr></thead><tbody>${rows || `<tr><td colspan="6"><div class="empty-state">No tasks match this view.</div></td></tr>`}</tbody></table></div>`;
};

renderTaskCards = function renderTaskCardsWithClashesAndComments(tasks) {
  return `<div class="mobile-card-list">${tasks.map((task) => `
    <article class="mobile-row-card ${taskHasStatusClash(task) ? 'task-row--clash' : ''}">
      <div class="mobile-row-card__head"><strong>${escapeHtml(task.title)}</strong><div class="task-card-badges">${renderTaskClashBadge(task, true)}${tradeIcon(task.trade)}</div></div>
      <p class="muted small" style="margin:8px 0 0">${escapeHtml(task.description)}</p>
      <div class="mobile-row-card__body">
        <div><div class="mobile-row-card__label">Trade</div><div class="mobile-row-card__value">${escapeHtml(task.trade)}</div></div>
        <div><div class="mobile-row-card__label">Assignee</div><div class="mobile-row-card__value">${escapeHtml(task.assignee)}</div></div>
        <div><div class="mobile-row-card__label">Due</div><div class="mobile-row-card__value">${formatDate(task.dueDate)}</div></div>
      </div>
      <div class="mobile-row-card__foot task-card-actions">${taskStatusSelect(task)}${renderTaskCommentButton(task)}</div>
    </article>`).join('') || `<div class="empty-state">No tasks match this view.</div>`}</div>`;
};

