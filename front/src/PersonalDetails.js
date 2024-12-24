import React from 'react';
import './PersonalDetails.css'; // 스타일을 따로 정의할 수 있습니다.

const PersonalDetails = ({ userInfo }) => {
  return (
    <div className="personal-details">
      <h3>개인 정보</h3>
      <div className="user-info">
        <div className="user-info-item">
          <strong>이름:</strong> {userInfo?.name || '정보 없음'}
        </div>
        <div className="user-info-item">
          <strong>이메일:</strong> {userInfo?.email || '정보 없음'}
        </div>
        <div className="user-info-item">
          <strong>생년월일:</strong> {userInfo?.birthDate || '정보 없음'}
        </div>
        <div className="user-info-item">
          <strong>성별:</strong> {userInfo?.gender || '정보 없음'}
        </div>
      </div>
    </div>
  );
};

export default PersonalDetails;
