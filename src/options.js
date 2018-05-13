/**
 * Saves options to chrome.storage
 */
function saveOptions() {
  let prj = document.getElementById('project').value;
  let usr = document.getElementById('user').value;
  chrome.storage.sync.set({
    project: prj,
    user: usr,
  }, function() {
    // Update status to let user know options were saved.
    let status = document.getElementById('status');
    status.textContent = 'Options saved.';
    status.hidden = false;
    setTimeout(function() {
      status.textContent = '';
      status.hidden = true;
    }, 1000);
  });
}

/**
 * Restores select box and checkbox state using the preferences
 * stored in chrome.storage.
 */
function restoreOptions() {
  chrome.storage.sync.get({
    project: 'Sunshine',
    user: 'nyx.linden',
  }, function(items) {
    document.getElementById('project').value = items.project;
    document.getElementById('user').value = items.user;
  });

  document.getElementById('save').addEventListener('click', saveOptions);
}
document.addEventListener('DOMContentLoaded', restoreOptions);
