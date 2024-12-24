import React, { useState, useEffect } from 'react';

const ResumeManagement = () => {
  const [resume, setResume] = useState(null);
  const [newResume, setNewResume] = useState(null);

  // 이력서 가져오기
  useEffect(() => {
    const fetchResume = async () => {
      try {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('토큰이 없습니다.');
        }
        
        const response = await fetch('http://localhost:5000/api/resume', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!response.ok) {
          throw new Error('이력서 불러오기 실패');
        }

        const data = await response.json();
        setResume(data.resume);
      } catch (err) {
        console.error('이력서 불러오기 실패:', err);
      }
    };
    
    fetchResume();
  }, []);

  // 이력서 업로드
  const handleUpload = async () => {
    if (!newResume) {
      alert('이력서 파일을 선택해주세요.');
      return;
    }
    
    const formData = new FormData();
    formData.append('resume', newResume);
    
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('토큰이 없습니다.');
      }
      
      const response = await fetch('http://localhost:5000/api/resume', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('이력서 업로드 실패');
      }

      const data = await response.json();
      alert('이력서가 등록되었습니다.');
      setResume(data.resume);
      setNewResume(null);
    } catch (err) {
      console.error('이력서 업로드 실패:', err);
      alert('이력서 업로드에 실패했습니다.');
    }
  };

  // 이력서 다운로드
  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('토큰이 없습니다.');
      }
      
      const response = await fetch('http://localhost:5000/api/resume/download', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('이력서 다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', resume.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('이력서 다운로드 실패:', err);
      alert('이력서 다운로드에 실패했습니다.');
    }
  };

  // 이력서 삭제
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('토큰이 없습니다.');
      }
      
      const response = await fetch('http://localhost:5000/api/resume', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('이력서 삭제 실패');
      }

      alert('이력서가 삭제되었습니다.');
      setResume(null);
    } catch (err) {
      console.error('이력서 삭제 실패:', err);
      alert('이력서 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="resume-management-container">
      <h2>이력서 관리</h2>
      {resume ? (
        <div className="resume-details">
          <p>현재 등록된 이력서: {resume.name}</p>
          <div className="resume-actions">
            <button onClick={handleDownload} className="btn-download">
              이력서 다운로드
            </button>
            <button onClick={handleDelete} className="btn-delete">
              이력서 삭제
            </button>
          </div>
        </div>
      ) : (
        <p className="no-resume">등록된 이력서가 없습니다.</p>
      )}
      
      <div className="resume-upload">
        <input 
          type="file" 
          accept=".pdf,.doc,.docx" 
          onChange={(e) => setNewResume(e.target.files[0])}
          className="file-input"
        />
        <button 
          onClick={handleUpload} 
          disabled={!newResume}
          className="btn-upload"
        >
          이력서 등록
        </button>
      </div>
    </div>
  );
};

export default ResumeManagement;