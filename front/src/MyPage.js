import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';  // useNavigate 추가
import './MyPage.css';
import PersonalInfo from './PersonalInfo';
import ResumeManagement from './ResumeManagement';
import AppointmentManagement from './AppointmentManagement';
import AccountDeactivation from './AccountDeactivation';

const MyPage = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMenu, setSelectedMenu] = useState('personal');
  
  const navigate = useNavigate();  // useNavigate 훅을 사용하여 navigate 함수 가져오기

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          setError('로그인 정보가 없습니다. 다시 로그인해주세요.');
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:5000/api/user-info', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data.success) {
          setUserInfo(response.data.user);
        } else {
          setError(response.data.message || '사용자 정보를 가져오지 못했습니다.');
        }
      } catch (err) {
        setError('서버 요청 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const handleMenuChange = (menu) => {
    setSelectedMenu(menu);
  };

  if (loading) {
    return <div className="mypage-loading">로딩 중...</div>;
  }

  if (error) {
    return <div className="mypage-error">{error}</div>;
  }

  return (
    <div className="mypage-container">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)}  // Navigate back to the previous page
        className="back-button"
      >
        <span>JOBHUB</span> {/* Back arrow icon */}
      </button>

      <div className="mypage-sidebar">
        <div className="user-profile">
          <img 
            src={userInfo?.profileImage || '/default-profile.png'} 
            alt="" 
            className="profile-image" 
          />
          <div className="user-name">{userInfo?.username ? `${userInfo.username}님` : '사용자'}</div>
          {/* 이름 표시 */}
        </div>
        
        <div className="mypage-menu">
          <button 
            className={`menu-item ${selectedMenu === 'personal' ? 'active' : ''}`} 
            onClick={() => handleMenuChange('personal')}
          >
            <i className="icon-profile"></i> 개인정보 수정
          </button>
          <button 
            className={`menu-item ${selectedMenu === 'resume' ? 'active' : ''}`} 
            onClick={() => handleMenuChange('resume')}
          >
            <i className="icon-resume"></i> 이력서 관리
          </button>
          <button 
            className={`menu-item ${selectedMenu === 'appointments' ? 'active' : ''}`} 
            onClick={() => handleMenuChange('appointments')}
          >
            <i className="icon-calendar"></i> 일정 관리
          </button>
          <button 
            className={`menu-item ${selectedMenu === 'deactivation' ? 'active' : ''}`} 
            onClick={() => handleMenuChange('deactivation')}
          >
            <i className="icon-logout"></i> 회원 탈퇴
          </button>
        </div>
      </div>

      <div className="mypage-content">
        <div className="content-header">
          <h2>{
            {
              'personal': '개인정보 수정',
              'resume': '이력서 관리',
              'appointments': '일정 관리',
              'deactivation': '회원 탈퇴'
            }[selectedMenu]
          }</h2>
        </div>
        
        <div className="content-body">
          {selectedMenu === 'personal' && <PersonalInfo userInfo={userInfo} />}
          {selectedMenu === 'resume' && <ResumeManagement />}
          {selectedMenu === 'appointments' && <AppointmentManagement />}
          {selectedMenu === 'deactivation' && <AccountDeactivation />}
        </div>
      </div>
    </div>
  );
};

export default MyPage;
