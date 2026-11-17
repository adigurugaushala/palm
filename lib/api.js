// Thin fetch wrapper for the Express API. Every non-GET call sends the x-guruji header
// that the server's CSRF gate requires.
export async function api(method, url, body) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch('/api' + url, {
    method,
    credentials: 'same-origin',
    headers: { 'x-guruji': '1', ...(body && !isForm ? { 'content-type': 'application/json' } : {}) },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong — please try again');
    err.status = res.status;
    throw err;
  }
  return data;
}

// Upload with progress (fetch has no upload progress events, so XHR it is).
export function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', '/api' + url);
    x.setRequestHeader('x-guruji', '1');
    x.upload.onprogress = e => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => {
      let d = {};
      try { d = JSON.parse(x.responseText); } catch {}
      if (x.status < 300) resolve(d);
      else reject(Object.assign(new Error(d.error || 'Upload failed'), { status: x.status }));
    };
    x.onerror = () => reject(new Error('Network error — please check your connection'));
    x.send(formData);
  });
}

export const homeFor = u => (!u ? '/login' : u.role === 'admin' ? '/admin' : u.role === 'reviewer' ? '/guruji' : '/account');
