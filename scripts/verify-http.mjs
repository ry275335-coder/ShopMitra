// scripts/verify-http.mjs
import http from 'node:http';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

async function verify() {
  console.log('Fetching http://localhost:3000 ...');
  const res = await get('http://localhost:3000');
  console.log('HTML Status:', res.statusCode);

  // Extract CSS link
  const match = res.data.match(/href="(\/_next\/static\/css\/[^"]+\.css[^"]*)"/);
  if (match) {
    const cssPath = match[1];
    console.log('Found CSS link:', cssPath);
    const cssRes = await get('http://localhost:3000' + cssPath);
    console.log('CSS Status:', cssRes.statusCode);
    console.log('CSS Byte Length:', cssRes.data.length);
    console.log('Tailwind utilities sample:', cssRes.data.substring(0, 180));
  } else {
    console.log('No CSS stylesheet tag found in HTML');
  }
}

verify();
