import { Routes, Route } from 'react-router-dom';
import ProductSelect from '@/pages/ProductSelect';
import OrderForm from '@/pages/OrderForm';
import Confirm from '@/pages/Confirm';
import AdminOrders from '@/pages/AdminOrders';
import ProductCategories from '@/pages/ProductCategories';
import ProductMaster from '@/pages/ProductMaster';
import CategoryProducts from '@/pages/CategoryProducts';
import ProductDetail from '@/pages/ProductDetail';
import OrderDetail from '@/pages/OrderDetail';
import UpdateHistory from '@/pages/UpdateHistory';
import OrderAnalysis from '@/pages/OrderAnalysis';
import AdminGate from '@/components/layout/AdminGate';
import AdminAccounts from '@/pages/AdminAccounts';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProductSelect />} />
      <Route path="/categories/:categoryId/products" element={<CategoryProducts />} />
      <Route path="/products/:productId" element={<ProductDetail />} />
      <Route path="/order/:productId" element={<OrderForm />} />
      <Route path="/confirm" element={<Confirm />} />
      <Route element={<AdminGate />}>
        <Route path="/admin" element={<AdminOrders />} />
        <Route path="/admin/orders/:orderId" element={<OrderDetail />} />
        <Route path="/admin/order-analysis" element={<OrderAnalysis />} />
        <Route path="/admin/master/product-categories" element={<ProductCategories />} />
        <Route path="/admin/master/products" element={<ProductMaster />} />
        <Route path="/admin/master/accounts" element={<AdminAccounts />} />
        <Route path="/admin/updates" element={<UpdateHistory />} />
      </Route>
    </Routes>
  );
}
