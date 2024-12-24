import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true); // 로딩 상태 관리
  const [error, setError] = useState(null); // 에러 상태 관리

  const getToken = async () => {
    const kakao_token = new URLSearchParams(window.location.search).get("code"); // URL에서 'code' 파라미터 가져오기
    console.log("Received Kakao token:", kakao_token); // 받은 카카오 토큰을 콘솔에 출력

    try {
      const res = await axios.post(
        "https://kauth.kakao.com/oauth/token",
        new URLSearchParams({
          grant_type: "authorization_code",
          client_id: process.env.REACT_APP_KAKAO_APP_KEY, // 환경변수에서 카카오 앱 키 가져오기
          redirect_uri: process.env.REACT_APP_KAKAO_REDIRECT_URL, // 환경변수에서 리디렉션 URI 가져오기
          code: kakao_token, // 인증 코드
        }),
        {
          headers: {
            "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
          },
        }
      );
      console.log("Token response:", res.data); // 토큰 응답을 콘솔에 출력
      return res.data;
    } catch (err) {
      console.error("Error getting token", err);
      throw err; // 에러가 발생하면 catch로 전달
    }
  };

  const getUserInfo = async (accessToken) => {
    try {
      const res = await axios.get("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log("User info response:", res.data); // 사용자 정보 응답을 콘솔에 출력
      return res.data;
    } catch (err) {
      console.error("Error getting user info", err);
      throw err; // 에러가 발생하면 catch로 전달
    }
  };

  const saveUserToDB = async (userData) => {
    try {
      const res = await axios.post('http://localhost:5000/api/kakao-login', { accessToken: localStorage.getItem("token"), userData }); // 서버에 사용자 정보 저장 요청
      console.log("User saved to DB response:", res.data); // DB 저장 응답을 콘솔에 출력
      return res.data; // 서버의 응답 반환
    } catch (err) {
      console.error("Error saving user to DB", err);
      throw err; // 에러가 발생하면 catch로 전달
    }
  };

  useEffect(() => {
    getToken()
      .then((data) => {
        localStorage.setItem("token", data.access_token); // 토큰을 로컬 스토리지에 저장
        console.log("Token saved to local storage"); // 토큰 저장 로그
        return getUserInfo(data.access_token); // 사용자 정보 가져오기
      })
      .then((userData) => {
        localStorage.setItem("kakao_user", JSON.stringify(userData)); // 사용자 정보를 로컬 스토리지에 저장
        console.log("User data saved to local storage:", userData); // 사용자 정보 저장 로그
        return saveUserToDB(userData); // 사용자 정보를 DB에 저장
      })
      .then(() => {
        setLoading(false);
        console.log("Navigation to main page"); // 메인 페이지로 이동 로그
        navigate("/main"); // 토큰 저장 후 메인 페이지로 리디렉션
      })
      .catch((err) => {
        setError("로그인에 실패했습니다. 다시 시도해주세요."); // 에러 메시지 설정
        setLoading(false);
        console.error("Navigation to LoginPage due to error:", err); // 에러 발생 시 로그인 페이지 이동 로그
        navigate("/LoginPage"); // 실패 시 로그인 페이지로 리디렉션
      });
  }, [navigate]);

  if (loading) {
    return <div>로딩 중...</div>; // 로딩 중 화면
  }

  if (error) {
    return <div>{error}</div>; // 에러 화면
  }

  return null; // 정상 처리 시 아무 것도 렌더링하지 않음
};

export default Auth;
