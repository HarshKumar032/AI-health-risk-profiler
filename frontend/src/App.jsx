import React from 'react';
import UploadForm from './components/UploadForm';

export default function App(){
  return (
    <div style={{padding: 20, fontFamily: 'Arial, sans-serif', maxWidth: 900, margin: 'auto'}}>
      <h1>AI-Powered Health Risk Profiler</h1>
      <p>Upload a scanned survey form or paste typed JSON/text. The backend will parse and return a structured risk profile.</p>
      <UploadForm />
    </div>
  );
}
