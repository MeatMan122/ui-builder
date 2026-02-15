import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';
import './animations/init'; // Register all built-in animation types

const root = createRoot(document.getElementById('root'));
root.render(<App />);
