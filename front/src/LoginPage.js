import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// Icons
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import './login-page.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      navigate('/main');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/login', { 
        email, 
        password 
      });

      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('jwt_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/main');
      } else {
        setError(response.data.message || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setError(err.response?.data?.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    const kakaoClientId = process.env.REACT_APP_KAKAO_APP_KEY;
    const kakaoRedirectUri = process.env.REACT_APP_KAKAO_REDIRECT_URL;
    const kakaoLoginUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoClientId}&redirect_uri=${kakaoRedirectUri}&response_type=code`;
    window.location.href = kakaoLoginUrl;
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-form">
          <h1>JOB HUB</h1>
          <p className="subtitle">로그인하고 서비스를 이용하세요</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <Mail className="input-icon" />
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <Lock className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="login-button" 
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="login-divider">
            <span>또는</span>
          </div>

          <button 
            onClick={handleKakaoLogin} 
            className="kakao-login-button"
          >
            카카오로 로그인
          </button>

          <div className="register-link">
            계정이 없으신가요? 
            <Link to="/register">회원가입</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;