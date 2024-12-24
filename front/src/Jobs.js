import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Clock, MapPin, Briefcase, Calendar, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './JobListing.css';

const useFavoriteCompanies = () => {
  const [favoriteCompanies, setFavoriteCompanies] = useState(() => {
    const saved = localStorage.getItem('favoriteCompanies');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('favoriteCompanies', JSON.stringify(favoriteCompanies));
  }, [favoriteCompanies]);

  const toggleFavoriteCompany = (company) => {
    setFavoriteCompanies(prevFavorites => {
      const isAlreadyFavorite = prevFavorites.includes(company);
      return isAlreadyFavorite 
        ? prevFavorites.filter(fav => fav !== company) 
        : [...prevFavorites, company];
    });
  };

  return { favoriteCompanies, toggleFavoriteCompany };
};

const JobCard = ({ job, onToggleCompanyFavorite, isFavorite }) => {
  const extractDeadline = (deadlineText) => {
    const regex = /(\d{2})\/(\d{2})\((.)\)/;
    const match = deadlineText.match(regex);
    if (match) {
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      const year = new Date().getFullYear();
      return new Date(year, month - 1, day);
    }
    return null;
  };

  const deadlineDate = extractDeadline(job.deadline);
  const currentDate = new Date();
  const remainingDays = deadlineDate ? Math.max(Math.floor((deadlineDate - currentDate) / (1000 * 60 * 60 * 24)), 0) : null;

  return (
    <div className="job-card">
      <div className="job-card-content">
        <div className="job-card-header">
          <h2 className="job-title">{job.title}</h2>
          <div className="job-card-actions">
            <button 
              onClick={() => onToggleCompanyFavorite(job.company)} 
              className={`favorite-btn ${isFavorite ? 'active' : ''}`}
            >
              <Heart size={20} fill={isFavorite ? 'red' : 'none'} />
            </button>
            <span className="job-deadline">D-{remainingDays}</span>
          </div>
        </div>
        <div className="job-card-details">
          <div className="job-detail"><Briefcase className="job-icon blue" /><span>{job.company}</span></div>
          <div className="job-detail"><MapPin className="job-icon green" /><span>{job.location}</span></div>
          <div className="job-detail"><Clock className="job-icon purple" /><span>{job.experience}</span></div>
          <div className="job-detail"><Calendar className="job-icon red" /><span>마감일: {job.deadline}</span></div>
          <div className="job-detail"><span>구인 유형: {job.jobType}</span></div>
        </div>
      </div>
      <div className="job-card-actions">
        <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="job-details-link">상세 정보</a>
      </div>
    </div>
  );
};

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const jobsPerPage = 10;

  const navigate = useNavigate();
  const { favoriteCompanies, toggleFavoriteCompany } = useFavoriteCompanies();

  useEffect(() => {
    axios.get('http://localhost:5000/api/crawl')
      .then(response => {
        if (response.data.success) {
          setJobs(response.data.jobs);
          setFilteredJobs(response.data.jobs);
        } else {
          console.log('크롤링된 데이터가 없습니다.');
        }
      })
      .catch(error => {
        console.error('데이터 로딩 오류:', error);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFilteredJobs(query ? jobs.filter(job => 
      job.title.toLowerCase().includes(query.toLowerCase()) ||
      job.company.toLowerCase().includes(query.toLowerCase()) ||
      job.location.toLowerCase().includes(query.toLowerCase())
    ) : jobs);
  };

  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);

  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="jobs-container">
      <button onClick={() => navigate(-1)} className="back-button">
        <ArrowLeft className="icon" />
      </button>

      <h1 className="jobs-title">JOBHUB 구인공고</h1>

      <div className="search-container">
        <input
          type="text"
          placeholder="구인 공고 검색"
          value={searchQuery}
          onChange={handleSearch}
          className="search-input"
        />
      </div>

      {filteredJobs.length > 0 ? (
        <div className="job-grid">
          {currentJobs.map((job, index) => (
            <JobCard 
              key={index} 
              job={job} 
              onToggleCompanyFavorite={toggleFavoriteCompany} 
              isFavorite={favoriteCompanies.includes(job.company)}
            />
          ))}
        </div>
      ) : (
        <div className="no-jobs">
          <p>현재 구인 공고가 없습니다.</p>
        </div>
      )}

      <div className="pagination">
        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="page-button">이전</button>
        
        {currentPage > 2 && <button onClick={() => paginate(1)} className="page-button">1</button>}
        {currentPage > 3 && <span className="ellipsis">...</span>}
        
        {Array.from({ length: 3 }, (_, i) => {
          const pageNum = currentPage - 1 + i;
          return pageNum > 0 && pageNum <= totalPages ? (
            <button 
              key={pageNum} 
              onClick={() => paginate(pageNum)} 
              className={`page-button ${currentPage === pageNum ? 'active' : ''}`}
            >
              {pageNum}
            </button>
          ) : null;
        })}
        
        {currentPage < totalPages - 1 && <span className="ellipsis">...</span>}
        {currentPage < totalPages && <button onClick={() => paginate(totalPages)} className="page-button">{totalPages}</button>}
        
        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="page-button">다음</button>
      </div>

      <div className="total-pages">
        <p>{`전체 페이지: ${totalPages}`}</p>
      </div>

      {/* 관심 기업 섹션 */}
      <div className="favorite-companies-section">
        <h3>관심 기업</h3>
        {favoriteCompanies.length > 0 ? (
          <ul>
            {favoriteCompanies.map((company, index) => (
              <li key={index}>{company}</li>
            ))}
          </ul>
        ) : (
          <p>관심 기업이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default Jobs;
