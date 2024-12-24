import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './UserManagement.css';

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newAppointment, setNewAppointment] = useState({
    jobTitle: '',       
    companyName: '',    
  });
  const [editMode, setEditMode] = useState(false);  
  const [currentAppointmentId, setCurrentAppointmentId] = useState(null);  

  // 일정 가져오기
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem('jwt_token');
        const response = await axios.get('http://localhost:5000/api/interview-schedules', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // API 응답 확인
        if (response.data.success && response.data.interviewSchedules) {
          setAppointments(response.data.interviewSchedules); 
        } else {
          console.error('일정 데이터가 없습니다.');
        }
      } catch (err) {
        console.error('일정 가져오기 실패:', err);
      }
    };
    fetchAppointments();
  }, []);

  // 일정 추가
  const handleAddAppointment = async () => {
    if (!newAppointment.jobTitle || !newAppointment.companyName) {
      alert('직무명과 회사명을 입력해주세요.');
      return;
    }
    const appointmentData = { 
      interview_date: selectedDate.toISOString().split('T')[0], 
      job_title: newAppointment.jobTitle,
      company_name: newAppointment.companyName, 
    };
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await axios.post('http://localhost:5000/api/interview-schedules', appointmentData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAppointments([...appointments, response.data.interviewSchedule]);
      setNewAppointment({ jobTitle: '', companyName: '' });
    } catch (err) {
      console.error('일정 추가 실패:', err);
    }
  };

  // 일정 수정
  const handleEditAppointment = async () => {
    if (!newAppointment.jobTitle || !newAppointment.companyName) {
      alert('직무명과 회사명을 입력해주세요.');
      return;
    }
    const appointmentData = { 
      interview_date: selectedDate.toISOString().split('T')[0], 
      job_title: newAppointment.jobTitle,
      company_name: newAppointment.companyName, 
      status: 'pending',  
    };
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await axios.put(`http://localhost:5000/api/interview-schedules/${currentAppointmentId}`, appointmentData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAppointments(appointments.map(appointment => 
        appointment.id === currentAppointmentId ? response.data.updatedAppointment : appointment
      ));
      setEditMode(false); 
      setNewAppointment({ jobTitle: '', companyName: '' }); 
    } catch (err) {
      console.error('일정 수정 실패:', err);
    }
  };

  // 일정 삭제
  const handleDeleteAppointment = async (id) => {
    const confirmDelete = window.confirm('정말로 이 일정을 삭제하시겠습니까?');
    if (confirmDelete) {
      try {
        const token = localStorage.getItem('jwt_token');
        await axios.delete(`http://localhost:5000/api/interview-schedules/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAppointments(appointments.filter(appointment => appointment.id !== id)); 
      } catch (err) {
        console.error('일정 삭제 실패:', err);
      }
    }
  };

  // 일정 수정 시, 기존 일정 데이터 입력
  const handleSelectAppointmentForEdit = (appointment) => {
    setEditMode(true);
    setCurrentAppointmentId(appointment.id);
    setNewAppointment({
      jobTitle: appointment.job_title,
      companyName: appointment.company_name,
    });
    setSelectedDate(new Date(appointment.interview_date));
  };

  return (
    <div className="user-management-container">
      <h3 className="user-management-title">일정 관리</h3>
      <Calendar 
        className="appointment-calendar"
        onChange={setSelectedDate} 
        value={selectedDate} 
      />
      <input
        type="text"
        className="user-management-input"
        value={newAppointment.jobTitle}
        onChange={(e) => setNewAppointment({ ...newAppointment, jobTitle: e.target.value })}
        placeholder="일정 표기"
      />
      <input
        type="text"
        className="user-management-input"
        value={newAppointment.companyName}
        onChange={(e) => setNewAppointment({ ...newAppointment, companyName: e.target.value })}
        placeholder="회사명"
      />
      <button 
        className="user-management-button" 
        onClick={editMode ? handleEditAppointment : handleAddAppointment}
      >
        {editMode ? '수정' : '추가'}
      </button>
      <ul className="appointment-list">
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            appointment && appointment.job_title ? ( // 유효성 검사 추가
              <li key={appointment.id} className="appointment-list-item">
                {appointment.job_title} - {appointment.company_name} ({appointment.interview_date})
                <button 
                  className="appointment-button edit-button" 
                  onClick={() => handleSelectAppointmentForEdit(appointment)}
                >
                  수정
                </button>
                <button 
                  className="appointment-button delete-button" 
                  onClick={() => handleDeleteAppointment(appointment.id)}
                >
                  삭제
                </button>
              </li>
            ) : null // undefined인 경우 null 반환
          ))
        ) : (
          <li>일정이 없습니다.</li>
        )}
      </ul>
    </div>
  );
};

export default AppointmentManagement;
