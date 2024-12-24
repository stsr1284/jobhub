const express = require('express');
const axios = require('axios');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
const bodyParser = require('body-parser');
const router = express.Router();
const cheerio = require('cheerio');
const jwt = require('jsonwebtoken');  // JWT 모듈 추가
const fs = require('fs');
const multer = require('multer');  // Multer for handling file uploads
const path = require('path');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 5000;

// .env 파일에서 환경 변수 불러오기
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const jwtSecretKey = process.env.JWT_SECRET_KEY;


// MySQL 연결 설정
const db = mysql.createConnection({
  host: dbHost,  // 환경변수로 DB 호스트 설정
  user: dbUser,  // 환경변수로 DB 사용자 이름 설정
  password: dbPassword,  // 환경변수로 DB 비밀번호 설정
  database: dbName,  // 환경변수로 DB 이름 설정
});

// MySQL 연결 테스트
db.connect((err) => {
  if (err) {
    console.error('MySQL 연결 실패:', err);
  } else {
    console.log('MySQL에 성공적으로 연결되었습니다.');
  }
});

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());

// JWT 인증 미들웨어
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];  // Authorization 헤더에서 Bearer 토큰 추출

  if (!token) {
    return res.status(403).json({ message: '토큰이 제공되지 않았습니다.' });
  }

  jwt.verify(token, jwtSecretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '토큰이 유효하지 않습니다.' });
    }

    req.user = user;  // 유저 정보 저장
    next();
  });
};

// 회원가입 API
app.post('/api/register', async (req, res) => {
  const { username, password, email, birthDate, gender } = req.body;

  if (!username || !password || !email || !birthDate || !gender) {
    return res.status(400).json({ success: false, message: '필수 필드가 누락되었습니다.' });
  }

  try {
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 중복 확인 및 사용자 저장
    const checkQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
    const insertQuery = `
      INSERT INTO users (username, email, password, birthDate, gender)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(checkQuery, [username, email], (err, results) => {
      if (err) {
        console.error('중복 확인 중 오류 발생:', err);
        return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
      }

      if (results.length > 0) {
        return res.json({ success: false, message: '이미 존재하는 아이디 또는 이메일입니다.' });
      }

      // 사용자 데이터 저장
      db.query(
        insertQuery,
        [username, email, hashedPassword, birthDate, gender],
        (err) => {
          if (err) {
            console.error('사용자 저장 중 오류 발생:', err);
            return res.status(500).json({ success: false, message: '회원가입 실패' });
          }

          res.json({ success: true, message: '회원가입 성공!' });
        }
      );
    });
  } catch (err) {
    console.error('회원가입 처리 중 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT * FROM users WHERE email = ?';

  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error('로그인 중 오류 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 잘못되었습니다.' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 잘못되었습니다.' });
    }

    // JWT 토큰 발급
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, jwtSecretKey, { expiresIn: '1h' });

    res.json({ success: true, message: '로그인 성공!', token, user: { id: user.id, username: user.username, email: user.email } });
  });
});

// 카카오 사용자 정보를 가져오는 함수 추가
const getKakaoUserInfo = async (accessToken) => {
  try {
    const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('카카오 사용자 정보 가져오기 중 오류 발생:', error);
    throw error; // 에러를 다시 던져서 호출한 곳에서 처리할 수 있도록 합니다.
  }
};

// 카카오 로그인 API
app.post('/api/kakao-login', async (req, res) => {
  const { accessToken } = req.body;

  try {
    const userInfo = await getKakaoUserInfo(accessToken);
    const user = await saveKakaoUserToDB(userInfo);
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, jwtSecretKey, { expiresIn: '1h' });
    
    res.json({ success: true, message: '로그인 성공!', token, user });
  } catch (error) {
    console.error('카카오 로그인 중 오류 발생:', error);
    if (error.response) {
      // 카카오 API에서 반환된 에러 메시지
      return res.status(error.response.status).json({ success: false, message: error.response.data });
    }
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 카카오 사용자 정보를 DB에 저장 또는 업데이트하는 함수
const saveKakaoUserToDB = async (userInfo) => {
  const { id, kakao_account } = userInfo;
  const email = kakao_account.email;
  const username = kakao_account.profile.nickname;
  const profileImage = kakao_account.profile.profile_image;

  // 사용자 정보 쿼리 (테이블 이름 변경)
  const checkQuery = 'SELECT * FROM kakao_users WHERE id = ?';
  const insertQuery = `
    INSERT INTO kakao_users (id, email, username, profileImage)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    username = VALUES(username),
    profileImage = VALUES(profileImage);
  `;

  return new Promise((resolve, reject) => {
    // 사용자 존재 여부 확인
    db.query(checkQuery, [id], (err, results) => {
      if (err) {
        console.error('DB 확인 중 오류 발생:', err);
        return reject(err);
      }

      if (results.length > 0) {
        // 사용자 정보가 이미 존재할 경우
        resolve(results[0]); // 기존 사용자 정보 반환
      } else {
        // 새로운 사용자 정보 저장
        db.query(insertQuery, [id, email, username, profileImage], (err, result) => {
          if (err) {
            console.error('사용자 정보 저장 중 오류 발생:', err);
            return reject(err);
          }

          // 저장된 사용자 정보 반환
          resolve({ id, email, username, profileImage });
        });
      }
    });
  });
};


app.get('/api/user-info', authenticateJWT, (req, res) => {
  const userId = req.user.id; // JWT에서 사용자 ID 가져오기

  // 사용자 정보 조회 쿼리
  const query = 'SELECT id, username, email, birthDate, gender FROM users WHERE id = ?';

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('사용자 정보 조회 중 오류 발생:', err.message);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    // 성공적으로 사용자 정보를 반환
    res.json({ success: true, user: results[0] });
  });
});


app.delete('/api/deactivate', authenticateJWT, (req, res) => {
  const userId = req.user.id; // JWT로부터 사용자 정보 추출 (id)

  // 사용자 삭제 쿼리
  const deleteUserQuery = 'DELETE FROM users WHERE id = ?';

  // 해당 사용자의 데이터 삭제
  db.query(deleteUserQuery, [userId], (err, result) => {
    if (err) {
      console.error('회원 탈퇴 중 오류 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    // 성공적으로 탈퇴 처리 후 응답
    res.json({ success: true, message: '회원 탈퇴가 완료되었습니다.' });
  });
});

app.post('/api/interview-schedules', authenticateJWT, (req, res) => {
  const { interview_date, job_title, company_name } = req.body;
  const userId = req.user.id; // Get userId from JWT

  if (!interview_date || !job_title || !company_name) {
    return res.status(400).json({ success: false, message: '필수 필드가 누락되었습니다.' });
  }

  const query = 'INSERT INTO interview_schedules (user_id, interview_date, job_title, company_name) VALUES (?, ?, ?, ?)';
  db.query(query, [userId, interview_date, job_title, company_name], (err, result) => {
    if (err) {
      console.error('면접 일정 등록 중 오류 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    res.json({ success: true, message: '면접 일정이 등록되었습니다.', interviewScheduleId: result.insertId });
  });
});

app.post('/api/interview-schedules', authenticateJWT, (req, res) => {
  const { interview_date, job_title, company_name } = req.body;
  const userId = req.user.id; // Get userId from JWT

  if (!interview_date || !job_title || !company_name) {
    return res.status(400).json({ success: false, message: '필수 필드가 누락되었습니다.' });
  }

  const query = 'INSERT INTO interview_schedules (user_id, interview_date, job_title, company_name) VALUES (?, ?, ?, ?)';
  db.query(query, [userId, interview_date, job_title, company_name], (err, result) => {
    if (err) {
      console.error('면접 일정 등록 중 오류 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    res.json({ success: true, message: '면접 일정이 등록되었습니다.', interviewScheduleId: result.insertId });
  });
});

// Get Interview Schedules
app.get('/api/interview-schedules', authenticateJWT, (req, res) => {
  const userId = req.user.id; // Get userId from JWT

  const query = 'SELECT * FROM interview_schedules WHERE user_id = ? ORDER BY interview_date';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('면접 일정 조회 중 오류 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    res.json({ success: true, interviewSchedules: results }); // 응답 구조에 맞게 수정
  });
});

// Update Interview Schedule
app.put('/api/interview-schedules/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { interview_date, job_title, company_name, status } = req.body;
  const userId = req.user.id; // Get userId from JWT

  if (!interview_date || !job_title || !company_name || !status) {
    return res.status(400).json({ success: false, message: '필수 필드가 누락되었습니다.' });
  }

  const query = 'UPDATE interview_schedules SET interview_date = ?, job_title = ?, company_name = ?, status = ? WHERE id = ? AND user_id = ?';
  db.query(query, [interview_date, job_title, company_name, status, id, userId], (err, result) => {
    if (err) {
      console.error('면접 일정 업데이트 중 오류 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '해당 면접 일정이 없습니다.' });
    }

    res.json({ success: true, message: '면접 일정이 업데이트되었습니다.' });
  });
});

// Delete Interview Schedule
app.delete('/api/interview-schedules/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // Get userId from JWT

  const query = 'DELETE FROM interview_schedules WHERE id = ? AND user_id = ?';
  db.query(query, [id, userId], (err, result) => {
    if (err) {
      console.error('면접 일정 삭제 중 오류 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '해당 면접 일정이 없습니다.' });
    }

    res.json({ success: true, message: '면접 일정이 삭제되었습니다.' });
  });
});

app.put('/api/update-user-info', authenticateJWT, async (req, res) => {
  const userId = req.user.id; // JWT에서 사용자 ID 가져오기
  const { username, birthDate, gender } = req.body;

  // 필수 입력값 체크
  if (!username || !birthDate || !gender) {
    return res.status(400).json({ success: false, message: '필수 필드가 누락되었습니다.' });
  }

  // 유효한 날짜 형식인지 체크 (간단한 예시)
  const isValidDate = (date) => !isNaN(Date.parse(date));
  if (!isValidDate(birthDate)) {
    return res.status(400).json({ success: false, message: '올바른 날짜 형식이 아닙니다.' });
  }

  try {
    // SQL 쿼리 작성
    const updateQuery = `
      UPDATE users 
      SET username = ?, birthDate = ?, gender = ? 
      WHERE id = ?
    `;

    // 쿼리 실행
    db.query(updateQuery, [username, birthDate, gender, userId], (err, result) => {
      if (err) {
        console.error('사용자 정보 업데이트 중 오류 발생:', err.message);
        return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
      }

      // 업데이트가 실패한 경우
      if (result.affectedRows === 0) {
        console.error(`사용자 정보 업데이트 실패: 사용자 ID ${userId}를 찾을 수 없습니다.`);
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
      }

      // 성공적으로 업데이트된 경우
      res.json({ success: true, message: '사용자 정보가 성공적으로 업데이트되었습니다.' });
    });
  } catch (error) {
    console.error('사용자 정보 업데이트 중 오류:', error.message);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});


 

// 구인 공고 크롤링 API
app.get('/api/crawl', async (req, res) => {
  const keyword = req.query.keyword || 'developer';  // 기본 키워드 'developer' 사용
  const allpage = req.query.allpage || 3;  // 기본 페이지 수 3

  try {
    const allJobs = [];
    
    for (let page = 1; page <= allpage; page++) {
      const url = `https://www.saramin.co.kr/zf_user/search/recruit?search_area=main&search_done=y&search_optional_item=n&searchType=search&searchword=${keyword}&recruitPage=${page}&recruitSort=relation&recruitPageCount=100`;
      const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

      const $ = cheerio.load(response.data);
      const jobs = $('div.item_recruit');  // 구인 공고 항목 선택

      jobs.each((index, job) => {
        try {
          const today = new Date().toISOString().split('T')[0];  // 현재 날짜 (YYYY-MM-DD)
          const title = $(job).find('a').attr('title').trim().replace(',', '');
          const company = $(job).find('div.area_corp > strong > a').text().trim();
          const jobUrl = 'https://www.saramin.co.kr' + $(job).find('a').attr('href');
          const deadline = $(job).find('span.date').text().trim();
          const location = $(job).find('div.job_condition > span').eq(0).text().trim();
          const experience = $(job).find('div.job_condition > span').eq(1).text().trim();
          const requirement = $(job).find('div.job_condition > span').eq(2).text().trim();
          const jobType = $(job).find('div.job_condition > span').eq(3).text().trim();

          // MySQL에 데이터 저장
          const insertQuery = 'INSERT INTO jobs (date, title, company, url, deadline, location, experience, requirement, job_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
          db.query(insertQuery, [today, title, company, jobUrl, deadline, location, experience, requirement, jobType], (err) => {
            if (err) {
              console.error('크롤링된 데이터 저장 중 오류 발생:', err);
            }
          });

          // 크롤링된 데이터 배열에 추가
          allJobs.push({ today, title, company, jobUrl, deadline, location, experience, requirement, jobType });
        } catch (e) {
          console.error('크롤링 오류 발생:', e);
        }
      });
    }
    
    res.json({ success: true, jobs: allJobs });
  } catch (error) {
    console.error('크롤링 중 오류 발생:', error);
    res.status(500).json({ success: false, message: '크롤링 중 오류가 발생했습니다.' });
  }
});

// 디렉토리 경로 설정
const uploadDir = path.join(__dirname, 'uploads', 'resumes');

// 디렉토리가 없으면 자동으로 생성
fs.existsSync(uploadDir) || fs.mkdirSync(uploadDir, { recursive: true });

// Multer 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 파일이 저장될 경로
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 파일 이름 설정
    cb(null, Date.now() + path.extname(file.originalname)); // 파일명에 타임스탬프 추가
  }
});

const upload = multer({ storage });

// 이력서 다운로드 API
app.get('/api/resume/download', authenticateJWT, (req, res) => {
  const userId = req.user.id;

  const query = 'SELECT * FROM resumes WHERE user_id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('이력서 다운로드 중 오류 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: '등록된 이력서가 없습니다.' });
    }

    const resume = results[0];
    const resumePath = path.join(__dirname, resume.path); // 이력서 파일 경로

    res.download(resumePath, resume.name, (err) => {
      if (err) {
        console.error('파일 다운로드 실패:', err);
        res.status(500).send('파일 다운로드에 실패했습니다.');
      }
    });
  });
});

// 이력서 조회 API
app.get('/api/resume', authenticateJWT, (req, res) => {
  const userId = req.user.id;

  const query = 'SELECT * FROM resumes WHERE user_id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('이력서 조회 중 오류 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: '등록된 이력서가 없습니다.' });
    }

    res.json({ success: true, resume: results[0] });
  });
});

// 이력서 업로드 API
app.post('/api/resume', authenticateJWT, upload.single('resume'), (req, res) => {
  const userId = req.user.id;
  const resumeFile = req.file;

  if (!resumeFile) {
    return res.status(400).json({ success: false, message: '이력서 파일이 업로드되지 않았습니다.' });
  }

  const resumePath = `/uploads/resumes/${resumeFile.filename}`;

  const checkQuery = 'SELECT * FROM resumes WHERE user_id = ?';
  db.query(checkQuery, [userId], (err, results) => {
    if (err) {
      console.error('이력서 확인 중 오류 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    if (results.length > 0) {
      return res.status(400).json({ success: false, message: '이미 이력서가 등록되어 있습니다.' });
    }

    const query = 'INSERT INTO resumes (user_id, name, path) VALUES (?, ?, ?)';
    db.query(query, [userId, resumeFile.originalname, resumePath], (err, result) => {
      if (err) {
        console.error('이력서 업로드 중 오류 발생:', err);
        return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
      }

      res.json({ success: true, message: '이력서가 등록되었습니다.', resume: { name: resumeFile.originalname, path: resumePath } });
    });
  });
});

app.delete('/api/resume', authenticateJWT, (req, res) => {
  const userId = req.user.id;

  // 사용자 이력서 조회 쿼리
  const query = 'SELECT * FROM resumes WHERE user_id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('이력서 삭제 중 오류 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: '삭제할 이력서가 없습니다.' });
    }

    const resume = results[0];
    const resumePath = path.join(__dirname, resume.path); // 이력서 파일 경로

    // 데이터베이스에서 이력서 삭제
    const deleteQuery = 'DELETE FROM resumes WHERE user_id = ?';
    db.query(deleteQuery, [userId], (err) => {
      if (err) {
        console.error('이력서 삭제 중 오류 발생:', err);
        return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
      }

      // 파일 시스템에서 이력서 파일 삭제
      fs.unlink(resumePath, (err) => {
        if (err) {
          console.error('파일 삭제 중 오류 발생:', err);
          // 데이터베이스에서 삭제한 내용을 롤백할 수는 없지만, 사용자에게 알림
          return res.status(500).json({ success: false, message: '이력서 파일 삭제에 실패했습니다. 하지만 데이터베이스에서 삭제되었습니다.' });
        }

        res.json({ success: true, message: '이력서가 삭제되었습니다.' });
      });
    });
  });
});

// 연봉 데이터 크롤링 API
app.get('/api/salary-crawl', async (req, res) => {
  const allpage = req.query.allpage || 1; // 기본 페이지 수: 1

  try {
    const allSalaries = [];
    const baseURL = 'https://www.saramin.co.kr';

    for (let page = 1; page <= allpage; page++) {
      const url = `${baseURL}/zf_user/salaries/industry/it-list?page=${page}`;

      const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

      if (response.status !== 200) {
        console.warn(`${page}페이지를 불러오는 데 실패했습니다.`);
        continue;
      }

      const $ = cheerio.load(response.data);
      const companies = $('li'); // 기업 정보 포함 태그 선택

      companies.each((_, company) => {
        try {
          const today = new Date().toISOString().split('T')[0]; // 현재 날짜 (YYYY-MM-DD)

          // 기업명 추출
          const companyNameTag = $(company).find('strong.tit_company a.link_tit');
          const companyName = companyNameTag.text().trim() || '기업명 없음';

          if (companyName === '기업명 없음') return; // 기업명이 없는 경우 건너뛰기

          // 기업 URL 추출 (상대 경로 -> 절대 경로 변환)
          const companyUrl = companyNameTag.attr('href') ? new URL(companyNameTag.attr('href'), baseURL).href : 'URL 없음';

          // 로고 URL 추출
          const logoUrl = $(company).find('span.inner_logo img').attr('src') || '로고 없음';

          // 기업 형태 추출
          const companyType = $(company).find('dl.info_item dt:contains("기업형태") + dd').text().trim() || '정보 없음';

          // 산업(업종) 추출
          const industry = $(company).find('dl.info_item dt:contains("산업(업종)") + dd').text().trim() || '정보 없음';

          // 연봉 정보 추출 (평균, 최저, 최고)
          const avgSalary = parseFloat($(company).find('span.wrap_graph.color01 .txt_avg').text().replace(/[^\d.-]/g, '')) || 0;
          const minSalary = parseFloat($(company).find('span.wrap_graph.color02 .txt_g').text().replace(/[^\d.-]/g, '')) || 0;
          const maxSalary = parseFloat($(company).find('span.wrap_graph.color03 .txt_g').text().replace(/[^\d.-]/g, '')) || 0;

          // 크롤링된 데이터 저장
          const insertQuery = `
            INSERT INTO companies (date, company_name, logo_url, company_type, industry, avg_salary, min_salary, max_salary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
          db.query(
            insertQuery,
            [today, companyName, logoUrl, companyType, industry, avgSalary, minSalary, maxSalary],
            (err) => {
              if (err) {
                console.error('연봉 데이터 저장 중 오류 발생:', err);
              }
            }
          );

          // 결과 배열에 추가
          allSalaries.push({
            date: today,
            companyName,
            companyUrl,
            logoUrl,
            companyType,
            industry,
            avgSalary,
            minSalary,
            maxSalary,
          });
        } catch (e) {
          console.error('기업 데이터 처리 중 오류 발생:', e);
        }
      });
    }

    res.json({ success: true, salaries: allSalaries });
  } catch (error) {
    console.error('크롤링 중 오류 발생:', error);
    res.status(500).json({ success: false, message: '크롤링 중 오류가 발생했습니다.' });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 시작되었습니다.`);
});
