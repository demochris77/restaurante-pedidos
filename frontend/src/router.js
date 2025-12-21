import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './components/HomeView.vue';
import MenuView from './components/MenuView.vue';
import PedidoStatus from './components/PedidoStatus.vue';
import MesasQR from './components/MesasQR.vue';
import CuentaView from './views/CuentaView.vue';
const routes = [
  { path: '/', component: HomeView },
  { path: '/menu', component: MenuView },
  { path: '/pedido/:id/status', component: PedidoStatus },
  { path: '/mesa/:id', component: PedidoStatus },
  { path: '/mesas-qr', name: 'mesas-qr', component: MesasQR },
  { path: '/cuenta/:id', name: 'cuenta', component: CuentaView },
}

];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
