async function test() {
  const urls = [
    "http://localhost:3000/api/departments/cmpgj9ywv00097djloo5j6qac",
    "http://localhost:3000/api/skills/cmpgib3xe0000hnjlvu93z0yp",
    "http://localhost:3000/api/rounds/cmpgkgaqq000avjjldmq82aof",
    "http://localhost:3000/api/evaluations/cmpgke34h0005vjjlbbeb1eaw"
  ];

  for (const url of urls) {
    console.log(`\nFetching ${url}...`);
    try {
      const res = await fetch(url);
      console.log("Status:", res.status);
      const text = await res.text();
      console.log("Response:", text.slice(0, 500));
    } catch (e: any) {
      console.error("Error:", e.message);
    }
  }
}

test();
