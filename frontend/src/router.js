import { createRouter, createWebHistory } from 'vue-router';
import MenuView from './views/MenuView.vue';
import HomeView from './views/HomeView.vue';

const routes = [
  { path: '/', component: HomeView },
  { path: '/menu', component: MenuView }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
