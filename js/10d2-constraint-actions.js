async function addConstraintFromForm(formData) {
  try {
    const attachments = await attachmentsFromForm(formData, 'constraintImages');
    const item = {
      id: nextId('c'),
      title: String(formData.get('title')).trim(),
      type: String(formData.get('type')) === 'Clash' ? 'Coordination' : String(formData.get('type')),
      priority: String(formData.get('priority')),
      status: 'active',
      description: String(formData.get('description')).trim(),
      startDate: dateOffset(0),
      endDate: String(formData.get('resolveBy')),
      owner: String(formData.get('owner')).trim(),
      attachments,
      comments: []
    };
    const activityLength = data.activity.length;
    data.constraints.unshift(item);
    addActivity('progress', `${item.title} added as a ${priorityLabel(item.priority)} constraint`);
    if (!persistWithRollback(() => {
      const itemIndex = data.constraints.indexOf(item);
      if (itemIndex >= 0) data.constraints.splice(itemIndex, 1);
      data.activity.splice(activityLength);
    })) return;
    ui.modal = null;
    render();
    toast(attachments.length ? 'Constraint and images added.' : 'Constraint added.');
  } catch (error) {
    console.warn('TradeSYNC could not add the constraint.', error);
    toast(error.message || 'The constraint could not be added.');
  }
}

async function addConstraintCommentFromForm(formData) {
  try {
    const item = data.constraints.find((constraint) => constraint.id === String(formData.get('constraintId')));
    const body = String(formData.get('body') || '').trim();
    const attachments = await attachmentsFromForm(formData, 'constraintCommentImages');
    if (!item || (!body && !attachments.length)) {
      toast('Add a comment or at least one image.');
      return;
    }
    const comments = constraintComments(item);
    const activityLength = data.activity.length;
    const comment = { id: nextId('cc'), author: CURRENT_USER, body, createdAt: new Date().toISOString(), attachments };
    comments.push(comment);
    addActivity('progress', `${item.title} constraint documentation updated`);
    if (!persistWithRollback(() => {
      const commentIndex = comments.indexOf(comment);
      if (commentIndex >= 0) comments.splice(commentIndex, 1);
      data.activity.splice(activityLength);
    })) return;
    ui.modal = { type: 'constraint-detail', constraintId: item.id };
    render();
    toast('Constraint documentation added and preserved.');
  } catch (error) {
    console.warn('TradeSYNC could not add the constraint comment.', error);
    toast(error.message || 'The constraint comment could not be added.');
  }
}
