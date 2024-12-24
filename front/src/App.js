import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import MainPage from './MainPage';  // 로그인 후 메인 화면 컴포넌트 추가
import Jobs from './Jobs';  // Jobs 컴포넌트 임포트
import Companies from './Companies';  // Companies 컴포넌트 임포트
import ChatUI from './ChatUI';  // ChatUI 컴포넌트 임포트
import MyPage from './MyPage';  // MyPage 컴포넌트 임포트
import ProtectedRoute from './ProtectedRoute';  // ProtectedRoute 컴포넌트 임포트
import Auth from "./Auth";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/main" element={<MainPage />} />  {/* 로그인 후 메인 화면 */}
        <Route path="/auth" element={<Auth />} />

        {/* ProtectedRoute로 감싸서 로그인된 사용자만 접근 가능 */}
        <Route path="/jobs" element={<ProtectedRoute element={<Jobs />} />} />  {/* 채용 페이지 */}
        <Route path="/companies" element={<ProtectedRoute element={<Companies />} />} />  {/* 기업 페이지 */}
        <Route path="/chatui" element={<ProtectedRoute element={<ChatUI />} />} />  {/* 직군 추천 페이지 */}
        <Route path="/mypage" element={<ProtectedRoute element={<MyPage />} />} />  {/* 마이페이지 */}
      </Routes>
    </Router>
  );
}

export default App;
