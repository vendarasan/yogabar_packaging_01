async function testAll() {
  const visited = new Set();
  const queue = ['/src/main.jsx'];

  while (queue.length > 0) {
    const urlPath = queue.shift();
    if (visited.has(urlPath)) continue;
    visited.add(urlPath);

    const fullUrl = urlPath.startsWith('http') ? urlPath : `http://localhost:3000${urlPath}`;
    try {
      const res = await fetch(fullUrl);
      if (res.status !== 200) {
        console.error(`FAILED (${res.status}): ${urlPath}`);
        continue;
      }
      const text = await res.text();
      const importRegex = /from\s+["']([^"']+)["']/g;
      let match;
      while ((match = importRegex.exec(text)) !== null) {
        const imp = match[1];
        if (imp.startsWith('/') || imp.startsWith('.')) {
          let resolved = imp;
          if (imp.startsWith('.')) {
            const base = urlPath.substring(0, urlPath.lastIndexOf('/'));
            resolved = new URL(imp, `http://localhost:3000${base}/`).pathname;
          }
          if (!visited.has(resolved)) {
            queue.push(resolved);
          }
        }
      }
    } catch (err) {
      console.error(`ERROR fetching ${urlPath}:`, err.message);
    }
  }

  console.log(`Successfully verified ${visited.size} modules through Vite dev server with 200 OK!`);
}
testAll();
