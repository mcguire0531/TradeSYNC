function renderClashModal() {
  const room = selectedRoom();
  const conflicts = roomTaskClashes();
  const tradeComplete = TRADE_META.filter((trade) => collaborationTradeSummary(trade.name, room.id, 'trade').status === 'complete').length;
  const turnerComplete = TRADE_META.filter((trade) => collaborationTradeSummary(trade.name, room.id, 'turner').status === 'complete').length;
  const list = conflicts.length
    ? `<div class="clash-record-list">${conflicts.map((task) => `
        <article class="clash-record"><div class="clash-record__icon">${icon('bolt')}</div><div class="clash-record__body"><div class="strong">${escapeHtml(task.title)}</div><div class="small muted">${escapeHtml(task.trade)} · Room ${escapeHtml(task.roomId)}</div><div class="clash-status-compare"><div><span>Trade View</span>${taskStatusMarkup(task.tradeStatus)}</div><div><span>Turner View</span>${taskStatusMarkup(task.turnerStatus)}</div></div></div>${renderTaskCommentButton(task, true)}</article>`).join('')}</div>`
    : `<div class="empty-state"><div class="empty-state__icon">${icon('check')}</div><strong>No Trade/Turner status clashes.</strong><p class="muted small no-margin">Both interfaces currently agree on every shared task.</p></div>`;
  const body = `
    <div class="clash-room-summary"><div><span>Trade View</span><strong>${tradeComplete} of ${TRADE_META.length} trades complete</strong></div><div><span>Turner View</span><strong>${turnerComplete} of ${TRADE_META.length} trades complete</strong></div></div>
    ${Number(room.clashes || 0) ? `<div class="coordination-clash-note">${icon('bolt')} ${room.clashes} additional room coordination clash${room.clashes === 1 ? '' : 'es'} are recorded separately from constraints.</div>` : ''}
    ${list}`;
  return modalShell(`Room ${room.number} Clashes`, body, `<button class="button button--primary" type="button" data-action="close-modal">Close</button>`);
}

renderModal = function renderModalWithCollaborationDocumentation() {
  if (!ui.modal) return '';
  if (ui.modal.type === 'inspection-comment') return renderInspectionCommentModal();
  if (ui.modal.type === 'add-constraint') return renderEnhancedConstraintModal();
  if (ui.modal.type === 'constraint-detail') return renderConstraintDetailModal();
  if (ui.modal.type === 'clashes') return renderClashModal();
  return collaborationRenderModalBase();
};
