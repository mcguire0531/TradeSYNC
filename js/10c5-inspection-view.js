renderInspectionDetail = function renderInspectionDetailWithDocumentationHistory() {
  const trade = ui.inspectionTrade;
  const list = data.inspections.filter((item) => item.trade === trade);
  const counts = inspectionCounts(trade);
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Inspections', back: '#inspections' })}
      <main class="page"><div class="content">
        <section class="toolbar section"><label class="select-wrap"><span class="sr-only">Select trade</span><select data-control="inspection-detail-trade">${[...new Set(data.inspections.map((item) => item.trade))].map((name) => `<option value="${escapeHtml(name)}" ${name === trade ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select></label><button class="button button--primary" type="button" data-action="open-add-inspection">${icon('plus')}Add Inspection</button></section>
        <section class="inspection-totals section"><div class="inspection-total"><span class="stat-card__icon icon-green">${icon('check')}</span><div><div class="stat-card__value">${counts.passed}</div><div class="stat-card__label">Passed</div></div></div><div class="inspection-total"><span class="stat-card__icon icon-red">${icon('x')}</span><div><div class="stat-card__value">${counts.failed}</div><div class="stat-card__label">Failed</div></div></div><div class="inspection-total"><span class="stat-card__icon icon-navy">${icon('minus')}</span><div><div class="stat-card__value">${counts.pending}</div><div class="stat-card__label">Not Inspected</div></div></div></section>
        <section class="card inspection-detail-card">
          <div class="inspection-detail-row inspection-detail-row--head"><div>Inspection</div><div>Status</div><div>Assignee</div><div>Scheduled</div><div>Completed</div><div>Result</div><div>Comments</div></div>
          ${list.map((item) => {
            const comments = inspectionCommentHistory(item);
            const latest = comments[comments.length - 1];
            const imageCount = comments.reduce((sum, comment) => sum + normalizeAttachments(comment.attachments).length, 0);
            return `<div><div class="inspection-detail-row"><div><div class="inspection-detail-row__title">${escapeHtml(item.title)}</div><div class="tiny muted" style="margin-top:4px">${escapeHtml(item.description)}</div></div><div>${inspectionStatusMarkup(item.status)}</div><div>${escapeHtml(item.assignee)}</div><div>${formatDate(item.scheduled)}</div><div>${formatDate(item.completed)}</div><div>${inspectionStatusSelect(item)}</div><div><button class="task-comment-button task-comment-button--compact" type="button" data-action="inspection-comment" data-inspection="${escapeHtml(item.id)}" aria-label="Open inspection comments">${icon('comment')}<span class="task-comment-count">${comments.length}</span></button></div></div>${latest ? `<div class="inspection-comment inspection-comment--history"><strong>${comments.length} documented comment${comments.length === 1 ? '' : 's'}${imageCount ? ` · ${imageCount} image${imageCount === 1 ? '' : 's'}` : ''}</strong>${latest.body ? `<br>${escapeHtml(latest.body)}` : ''}<br><span class="tiny">Latest by ${escapeHtml(latest.author)} on ${formatCommentTime(latest.createdAt)}</span></div>` : ''}</div>`;
          }).join('')}
        </section>
      </div></main>
      ${renderBottomNav('inspections')}${renderDrawer('inspections')}
    </div>`;
};
