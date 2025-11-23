import { createRouter, createWebHistory } from 'vue-router';
import MenuView from '../components/MenuView.vue'; // Cambia la ruta según donde está el archivo
import HomeView from './views/HomeView.vue'; // O crea un HomeView mínimo si no tienes

const routes = [
  { path: '/', component: HomeView },
  { path: '/menu', component: MenuView }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
