import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App/>
    <Toaster position="top-right" toastOptions={{style:{background:'#0a0e17',color:'#f1f5f9',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,fontFamily:'Inter,sans-serif',fontSize:'.85rem'},success:{iconTheme:{primary:'#00b4ff',secondary:'#0a0e17'}},error:{iconTheme:{primary:'#ef4444',secondary:'#0a0e17'}}}}/>
  </React.StrictMode>
)
