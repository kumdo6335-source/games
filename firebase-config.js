// Firebase configuration
// 실제 Firebase 프로젝트의 설정값으로 교체해주세요.
export const firebaseConfig = {
  apiKey: "AIzaSyCP3OOt5av46HDAuZXRqpqDbR97g5GHFyM",
  authDomain: "games-17d89.firebaseapp.com",
  projectId: "games-17d89",
  storageBucket: "games-17d89.firebasestorage.app",
  messagingSenderId: "581854800338",
  appId: "1:581854800338:web:77f30c9feb84a5ab9a400b"
};

// Firebase 설정이 유효한지 검사하는 유틸리티
export function isFirebaseConfigured() {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";
}
