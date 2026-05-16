import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './i18n/config';
import './App.css';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import GameOverScreen from './screens/GameOverScreen';
import SettingsScreen from './screens/SettingsScreen';
import { loadData } from './utils/storage';

// apply saved theme on load
const saved = loadData();
if (saved.colorTheme) document.documentElement.setAttribute('data-theme', saved.colorTheme);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/game/:mode" element={<GameScreen />} />
        <Route path="/gameover" element={<GameOverScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
