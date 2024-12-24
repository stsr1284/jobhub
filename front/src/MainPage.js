import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { MapPin, Briefcase, Filter, Heart, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import './MainPage.css';

const useFavoriteJobs = () => {
  const [favoriteJobs, setFavoriteJobs] = useState(() => {
    const saved = localStorage.getItem('favoriteJobs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('favoriteJobs', JSON.stringify(favoriteJobs));
  }, [favoriteJobs]);

  const toggleFavorite = (job) => {
    setFavoriteJobs(prevFavorites => {
      const isAlreadyFavorite = prevFavorites.some(
        fav => fav.title === job.title && fav.company === job.company
      );

      if (isAlreadyFavorite) {
        return prevFavorites.filter(
          fav => !(fav.title === job.title && fav.company === job.company)
        );
      } else {
        return [...prevFavorites, job];
      }
    });
  };

  return { favoriteJobs, toggleFavorite };
};

const useRecentJobs = () => {
  const [recentJobs, setRecentJobs] = useState(() => {
    const saved = localStorage.getItem('recentJobs');
    return saved ? JSON.parse(saved) : [];
  });

  const MAX_RECENT_JOBS = 10;

  const addRecentJob = (job) => {
    setRecentJobs(prevRecent => {
      const filteredJobs = prevRecent.filter(
        j => j.title !== job.title || j.company !== job.company
      );
      
      const updatedJobs = [job, ...filteredJobs].slice(0, MAX_RECENT_JOBS);
      
      localStorage.setItem('recentJobs', JSON.stringify(updatedJobs));
      return updatedJobs;
    });
  };

  return { recentJobs, addRecentJob };
};

const JobCard = ({ job, onFavorite, onView, isFavorite }) => {
  const calculateRemainingDays = (deadlineText) => {
    const regex = /(\d{2})\/(\d{2})\((.)\)/;
    const match = deadlineText.match(regex);
    if (match) {
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      const year = new Date().getFullYear();
      const deadlineDate = new Date(year, month - 1, day);
      const currentDate = new Date();
      const timeDifference = deadlineDate - currentDate;
      return Math.max(0, Math.floor(timeDifference / (1000 * 60 * 60 * 24)));
    }
    return 0;
  };

  const handleJobView = () => {
    onView(job);
    window.open(job.jobUrl, '_blank');
  };

  return (
    <div className="enhanced-job-card">
      <div className="job-card-content">
        <div className="job-card-header">
          <h2 className="job-title">{job.title}</h2>
          <div className="job-card-actions">
            <button 
              onClick={() => onFavorite(job)} 
              className={`favorite-btn ${isFavorite ? 'active' : ''}`}
            >
              <Heart size={20} fill={isFavorite ? 'red' : 'none'} />
            </button>
            <span className="job-deadline">
              D-{calculateRemainingDays(job.deadline)}
            </span>
          </div>
        </div>
        <div className="job-details">
          <div className="job-company">
            <Briefcase size={16} className="icon" />
            {job.company}
          </div>
          <div className="job-location">
            <MapPin size={16} className="icon" />
            {job.location}
          </div>
          <div className="job-meta">
            <span>{job.experience}</span>
            <span>{job.jobType}</span>
          </div>
        </div>
        <div className="job-card-view-action">
          <button onClick={handleJobView} className="job-details-link">
            <Eye size={16} className="icon" /> 상세 정보
          </button>
        </div>
      </div>
    </div>
  );
};

const MainPage = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    career: '',
    employmentType: '',
    region: ''
  });
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null); // 에러 상태 추가
  const jobsPerPage = 10;

  const { favoriteJobs, toggleFavorite } = useFavoriteJobs();
  const { recentJobs, addRecentJob } = useRecentJobs();

  useEffect(() => {
    const kakaoUserData = JSON.parse(localStorage.getItem('kakao_user'));
    const normalUserData = JSON.parse(localStorage.getItem('user'));
    
    if (kakaoUserData) {
      setUser(kakaoUserData.kakao_account.profile); // 카카오 사용자 정보
    } else if (normalUserData) {
      setUser(normalUserData); // 일반 사용자 정보
    }

    const token = localStorage.getItem('jwt_token');

    axios
      .get('http://localhost:5000/api/crawl', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })
      .then((response) => {
        if (response.data.success) {
          const jobsData = response.data.jobs.map((job) => ({
            ...job,
            companyLogo: `/logos/${job.company}.png`
          }));
          setJobs(jobsData);
          setFilteredJobs(jobsData);
        } else {
          console.log('크롤링된 데이터가 없습니다.');
        }
      })
      .catch((error) => {
        console.error('데이터 로딩 오류:', error);
        setError("데이터 로딩 중 오류가 발생했습니다."); // 에러 메시지 설정
      })
      .finally(() => {
        setLoading(false); // 로딩 상태 종료
      });
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    const filtered = jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(query.toLowerCase()) ||
        job.company.toLowerCase().includes(query.toLowerCase()) ||
        job.location.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredJobs(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('kakao_user'); // 카카오 사용자 정보 초기화
    localStorage.removeItem('user'); // 일반 사용자 정보 초기화
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('favoriteJobs'); // 찜한 공고 초기화
    localStorage.removeItem('recentJobs'); // 최근 본 공고 초기화
    setUser(null);
    navigate('/main');
  };

  const filteredAndSearchedJobs = useMemo(() => {
    return filteredJobs.filter((job) => {
      const matchesCareer = !filters.career || job.experience === filters.career;
      const matchesEmploymentType =
        !filters.employmentType || job.jobType === filters.employmentType;
      const matchesRegion = !filters.region || job.location.includes(filters.region);
      return matchesCareer && matchesEmploymentType && matchesRegion;
    });
  }, [filteredJobs, filters]);

  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredAndSearchedJobs.slice(indexOfFirstJob, indexOfLastJob);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const totalPages = Math.ceil(filteredAndSearchedJobs.length / jobsPerPage);
  const range = 2;
  const startPage = Math.max(1, currentPage - range);
  const endPage = Math.min(totalPages, currentPage + range);
  const pageNumbers = [];

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  const renderSidebarSection = (title, jobs, renderJob) => (
    <div className="sidebar-section">
      <h3>{title}</h3>
      {jobs.length > 0 ? (
        jobs.map((job, index) => renderJob(job, index))
      ) : (
        <p>항목이 없습니다.</p>
      )}
    </div>
  );

  const renderFavoriteJob = (job, index) => (
    <JobCard 
      key={`fav-${index}`} 
      job={job} 
      onFavorite={toggleFavorite} 
      onView={addRecentJob}
      isFavorite={true}
    />
  );

  const renderRecentJob = (job, index) => (
    <JobCard 
      key={`recent-${index}`} 
      job={job} 
      onFavorite={toggleFavorite} 
      onView={addRecentJob}
      isFavorite={favoriteJobs.some(
        fav => fav.title === job.title && fav.company === job.company
      )}
    />
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        {error} {/* 에러 메시지 표시 */}
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="main-header">
        <div className="header-content">
          <div className="logo">JOBHUB</div>
          <nav className="main-nav">
            <Link to="/jobs" className="nav-link">채용</Link>
            <Link to="/companies" className="nav-link">기업</Link>
            <Link to="/ChatUI" className="nav-link">직군추천</Link>
            <Link to="/mypage" className="nav-link">마이페이지</Link>
          </nav>
          <div className="auth-buttons">
            {user ? (
              <>
                <span>{user.nickname || user.username}님 접속</span> {/* 카카오 또는 일반 사용자 이름 */}
                <button className="logout-btn" onClick={handleLogout}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <button className="login-btn" onClick={() => navigate('/login')}>
                  로그인
                </button>
                <button className="signup-btn" onClick={() => navigate('/register')}>
                  회원가입
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="main-content-grid">
        <div className="enhanced-left-sidebar">
          <div className="filter-section">
            <h3 className="filter-title">
              <Filter size={20} /> 상세 검색
            </h3>

            <div className="filter-group">
              <label>경력</label>
              <select
                onChange={(e) => handleFilterChange('career', e.target.value)}
                value={filters.career}
              >
                <option value="">전체</option>
                <option value="신입">신입</option>
                <option value="경력">경력</option>
                <option value="무관">경력무관</option>
              </select>
            </div>

            <div className="filter-group">
              <label>고용 형태</label>
              <select
                onChange={(e) => handleFilterChange('employmentType', e.target.value)}
                value={filters.employmentType}
              >
                <option value="">전체</option>
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="인턴">인턴</option>
              </select>
            </div>

            <div className="filter-group">
              <label>지역</label>
              <select
                onChange={(e) => handleFilterChange('region', e.target.value)}
                value={filters.region}
              >
                <option value="">전체</option>
                <option value="서울">서울</option>
                <option value="경기">경기</option>
                <option value="인천">인천</option>
                <option value="부산">부산</option>
                <option value="대구">대구</option>
                <option value="광주">광주</option>
                <option value="대전">대전</option>
                <option value="울산">울산</option>
                <option value="강원">강원</option>
              </select>
            </div>
          </div>

          {renderSidebarSection('관심 공고', favoriteJobs, renderFavoriteJob)}
          {renderSidebarSection('최근 본 공고', recentJobs, renderRecentJob)}
        </div>

        <div className="job-listings">
          <div className="job-search">
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          <div className="job-cards">
            {currentJobs.map((job, index) => (
              <JobCard 
                key={index} 
                job={job} 
                onFavorite={toggleFavorite}
                onView={addRecentJob}
                isFavorite={favoriteJobs.some(
                  fav => fav.title === job.title && fav.company === job.company
                )}
              />
            ))}
          </div>

          <div className="pagination">
            <button onClick={() => paginate(prevPage)} disabled={!prevPage}>
              이전
            </button>
            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={number === currentPage ? 'active' : ''}
              >
                {number}
              </button>
            ))}
            <button onClick={() => paginate(nextPage)} disabled={!nextPage}>
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
