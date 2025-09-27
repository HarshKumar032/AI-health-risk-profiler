import React, { useState } from 'react';
import axios from 'axios';

export default function UploadForm(){
  const [file, setFile] = useState(null);
  const [text, setText] = useState('{"age":42,"smoker":true,"exercise":"rarely","diet":"high sugar"}');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      if (file) form.append('image', file);
      if (text) form.append('text', text);

      const resp = await axios.post('http://localhost:4000/api/parse', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(resp.data);
    } catch (err) {
      setError(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} style={{display:'grid',gap:12}}>
        <label>Upload scanned survey (image):
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
        </label>

        <label>Or paste typed JSON / text (will be used if provided):
          <textarea rows={6} value={text} onChange={e => setText(e.target.value)} style={{width:'100%'}} />
        </label>

        <div>
          <button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Submit'}</button>
        </div>
      </form>

      {error && <pre style={{color:'red'}}>{JSON.stringify(error, null, 2)}</pre>}

      {result && (
        <div style={{marginTop:20}}>
          <h3>Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
