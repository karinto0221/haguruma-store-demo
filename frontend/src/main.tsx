import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProductSelect from './pages/ProductSelect';
import OrderForm from './pages/OrderForm';
import Confirm from './pages/Confirm';
import AdminOrders from './pages/AdminOrders';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductSelect />} />
        <Route path="/order/:productId" element={<OrderForm />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/admin" element={<AdminOrders />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
