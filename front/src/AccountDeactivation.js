import React, { useState } from 'react';
import axios from 'axios';
import './UserManagement.css';

const AccountDeactivation = () => {
  const [loading, setLoading] = useState(false); // 로딩 상태 추가
  const [error, setError] = useState(''); // 에러 상태 추가
  const [success, setSuccess] = useState(''); // 성공 메시지 상태 추가

  const handleDeactivation = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      alert('로그인 상태에서만 탈퇴가 가능합니다.');
      return;
    }

    setLoading(true); // 요청 시작 시 로딩 상태 설정
    setError(''); // 에러 초기화
    setSuccess(''); // 성공 메시지 초기화

    try {
      const response = await axios.delete('http://localhost:5000/api/deactivate', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 서버 응답에 따라 처리
      if (response.data.success) {
        setSuccess(response.data.message || '회원 탈퇴가 완료되었습니다.');
        localStorage.removeItem('jwt_token');
        setTimeout(() => {
          window.location.href = '/login'; // 탈퇴 후 로그인 페이지로 리디렉션
        }, 2000); // 잠시 후 로그인 페이지로 이동
      } else {
        setError(response.data.message || '회원 탈퇴에 실패했습니다.');
      }
    } catch (err) {
      console.error('회원 탈퇴 실패:', err);
      setError('회원 탈퇴 실패: 서버 오류가 발생했습니다.');
    } finally {
      setLoading(false); // 요청 종료 후 로딩 상태 해제
    }
  };

  return (
    <div className="user-management-container">
      <h3 className="user-management-title">회원 탈퇴</h3>
      <div className="account-deactivation-warning">
        <p>회원 탈퇴 시, 모든 데이터가 삭제됩니다.</p>
      </div>
      
      {/* 에러 또는 성공 메시지 표시 */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <button 
        className="user-management-button deactivation-button" 
        onClick={handleDeactivation}
        disabled={loading} // 로딩 중에는 버튼 비활성화
      >
        {loading ? '탈퇴 중...' : '회원 탈퇴'}
      </button>
    </div>
  );
};

export default AccountDeactivation;
