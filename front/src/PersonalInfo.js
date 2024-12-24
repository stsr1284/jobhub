import React, { useState, useEffect } from 'react';
import './UserManagement.css';
import axios from 'axios';

const PersonalInfo = ({ userInfo }) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: userInfo?.username || '',
    email: userInfo?.email || '',
    birthDate: userInfo?.birthDate || '',
    gender: userInfo?.gender || ''
  });
  const [loading, setLoading] = useState(false); // 로딩 상태 추가
  const [error, setError] = useState(null); // 에러 상태 추가

  useEffect(() => {
    // userInfo가 제대로 전달되었는지 확인하고, birthDate가 있을 때만 처리
    if (userInfo?.birthDate) {
      const dateOnly = userInfo.birthDate.split('T')[0]; // 날짜만 분리
      setFormData(prevState => ({
        ...prevState,
        birthDate: dateOnly
      }));
    }
  }, [userInfo]);

  const handleEditClick = () => {
    setEditMode(true);
  };

  const handleSaveClick = async () => {
    setLoading(true); // 로딩 시작
    setError(null); // 기존 에러 초기화

    try {
      const token = localStorage.getItem('jwt_token'); // 토큰을 가져올 때 이름 확인

      // JWT 토큰이 없는 경우
      if (!token) {
        setError('로그인이 필요합니다.');
        return;
      }

      // 서버에 수정된 사용자 정보 전송
      const response = await axios.put('http://localhost:5000/api/update-user-info', formData, {
        headers: {
          Authorization: `Bearer ${token}` // JWT 토큰 전달
        }
      });

      if (response.data.success) {
        alert('정보가 성공적으로 수정되었습니다.');
        setEditMode(false); // 수정 완료 후 편집 모드 종료
      } else {
        setError(response.data.message || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  return (
    <div className="user-management-container personal-info">
      <h3 className="user-management-title">개인 정보</h3>
      <div className="user-info">
        <div className="user-info-item">
          <strong>사용자 이름:</strong> 
          {editMode ? (
            <input 
              type="text" 
              name="username"
              className="user-management-input"
              value={formData.username} 
              onChange={handleInputChange} 
            />
          ) : (
            formData.username || '정보 없음'
          )}
        </div>
        <div className="user-info-item">
          <strong>이메일:</strong> 
          {editMode ? (
            <input 
              type="email" 
              name="email"
              className="user-management-input"
              value={formData.email} 
              onChange={handleInputChange} 
            />
          ) : (
            formData.email || '정보 없음'
          )}
        </div>
        <div className="user-info-item">
          <strong>생년월일:</strong> 
          {editMode ? (
            <input 
              type="date" 
              name="birthDate"
              className="user-management-input"
              value={formData.birthDate} 
              onChange={handleInputChange} 
            />
          ) : (
            formData.birthDate || '정보 없음'
          )}
        </div>
        <div className="user-info-item">
          <strong>성별:</strong> 
          {editMode ? (
            <select 
              name="gender"
              className="personal-info-select"
              value={formData.gender} 
              onChange={handleInputChange}
            >
              <option value="">성별 선택</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          ) : (
            formData.gender === 'male' ? '남성' : 
            formData.gender === 'female' ? '여성' : '정보 없음'
          )}
        </div>
      </div>

      {error && <p className="error-message">{error}</p>} {/* 에러 메시지 출력 */}

      <div className="button-container">
        {!editMode ? (
          <button 
            className="user-management-button" 
            onClick={handleEditClick}
          >
            수정하기
          </button>
        ) : (
          <button 
            className="user-management-button" 
            onClick={handleSaveClick}
            disabled={loading} // 로딩 중에는 버튼 비활성화
          >
            {loading ? '저장 중...' : '저장하기'}
          </button>
        )}
      </div>
    </div>
  );
};

export default PersonalInfo;
