import { createRouter, createWebHistory } from 'vue-router';
import MenuView from './components/MenuView.vue';       // Importa desde components
import HomeView from './components/HomeView.vue';       // Pon algo aquí o crea el archivo

const routes = [
  { path: '/', component: HomeView },
  { path: '/menu', component: MenuView }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
