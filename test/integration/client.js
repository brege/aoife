import http from 'node:http';

const BASE_URL = 'http://localhost:5173';

export async function apiCall(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const contentType = res.headers['content-type'] || '';
          const isJson = contentType.includes('application/json');
          const data = isJson && body ? JSON.parse(body) : body;
          resolve({ statusCode: res.statusCode, data });
        } catch (_error) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

export async function search(query, mediaType) {
  const params = new URLSearchParams({
    q: query,
    type: mediaType,
  });

  return apiCall('GET', `/api/search?${params}`);
}

export async function add(mediaItem) {
  return apiCall('POST', '/api/add', mediaItem);
}

export async function remove(id) {
  return apiCall('DELETE', `/api/remove/${id}`);
}

export async function getGrid() {
  return apiCall('GET', '/api/grid');
}
