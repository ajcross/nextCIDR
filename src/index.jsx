import React from 'react';
import { createRoot } from 'react-dom/client'; // Importación específica
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container); // Creamos la raíz

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
