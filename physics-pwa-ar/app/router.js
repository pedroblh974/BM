const routes = {};
let current = '';

function setActiveTab(hash) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.route === hash));
}

export function navigateTo(hash) {
  if (location.hash !== hash) location.hash = hash;
  else window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function initRouter(handlers) {
  Object.assign(routes, handlers);
  function render() {
    const hash = location.hash || '#/dashboard';
    if (routes[hash]) {
      current = hash;
      setActiveTab(hash);
      routes[hash]();
      const main = document.getElementById('app');
      main.focus();
    }
  }
  window.addEventListener('hashchange', render);
  render();
}

