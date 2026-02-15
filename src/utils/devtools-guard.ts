/**
 * DevTools Guard — Production security layer
 * 
 * Blocks DevTools access, right-click inspect, and keyboard shortcuts
 * in production. Does nothing in development (localhost).
 */

const isProduction = (): boolean => {
  const hostname = window.location.hostname;
  return hostname !== 'localhost' && hostname !== '127.0.0.1';
};

const initDevToolsGuard = (): void => {
  if (!isProduction()) return;

  // Block right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Block keyboard shortcuts: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return;
    }
    // Ctrl+Shift+I (Inspect) or Cmd+Option+I (Mac)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return;
    }
    // Ctrl+Shift+J (Console) or Cmd+Option+J (Mac)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return;
    }
    // Ctrl+Shift+C (Element picker)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return;
    }
    // Ctrl+U (View source)
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      return;
    }
  });

  // Detect DevTools via debugger timing (anti-debug)
  const detectDevTools = (): void => {
    const threshold = 160;
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const duration = performance.now() - start;
    if (duration > threshold) {
      // DevTools detected — clear page content
      document.body.innerHTML = '';
      document.title = 'Access Denied';
    }
  };

  // Run detection periodically (every 2s)
  setInterval(detectDevTools, 2000);

  // Override console methods in production as extra safety
  const noop = (): void => {};
  if (typeof window !== 'undefined') {
    window.console.log = noop;
    window.console.warn = noop;
    window.console.error = noop;
    window.console.info = noop;
    window.console.debug = noop;
    window.console.trace = noop;
    window.console.dir = noop;
    window.console.table = noop;
  }
};

export default initDevToolsGuard;
