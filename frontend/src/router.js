import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './components/HomeView.vue';
import MenuView from './components/MenuView.vue';
import PedidoStatus from './components/PedidoStatus.vue';

const routes = [
  { path: '/', component: HomeView },
  { path: '/menu', component: MenuView },
  { path: '/pedido/:id/status', component: PedidoStatus }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
