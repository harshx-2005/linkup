import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import axios from 'axios';

// Set default base URL for Axios
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '/api';

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)