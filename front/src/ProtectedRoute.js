import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ element }) => {
  const token = localStorage.getItem('jwt_token'); // JWT 토큰 확인
  const kakaoUser = localStorage.getItem('kakao_user'); // 카카오 사용자 정보 확인

  // 로그인된 사용자가 아니면 로그인 페이지로 리디렉션
  return token || kakaoUser ? element : <Navigate to="/login" />;
};

export default ProtectedRoute