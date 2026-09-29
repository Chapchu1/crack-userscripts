# Crack Userscripts by chu

Tampermonkey에서 바로 설치하고 GitHub를 통해 자동 업데이트할 수 있도록 정리한 userscript 모음입니다.

## 설치

아래 링크를 모바일 브라우저에서 열면 Tampermonkey 설치 화면으로 연결됩니다.

| 스크립트 | 버전 | 설치 |
|---|---:|---|
| 📱 Crack Mobile Utility | 4.3.0.10 | [설치하기](https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-mobile-utility.user.js) |
| Crack TXT → ChatGPT 전송기 (모바일) | 1.3.3 | [설치하기](https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-txt-chatgpt-mobile.user.js) |
| ✨ Crack Muse Writer (AI 답변 커스텀) | 5.2.18 | [설치하기](https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-muse-writer.user.js) |
| Crack Profile Box (크랙 프로필 박스) | 1.2.3 | [설치하기](https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-profile-box.user.js) |
| 🖼️ CSP — 생성 이미지 배경·테마 | 4.3.31 | [설치하기](https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-theme-background.user.js) |
| 🖼️ Crack Custom Room — 직접 지정 이미지 배경·테마 | 4.1.11 | [설치하기](https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-custom-room-background.user.js) |

배경·테마 스크립트는 사용하는 배경 방식에 맞는 하나를 선택하세요. 총 78개 테마를 제공하며, 캐릭터 장식과 채팅창 이미지는 자동으로 불러옵니다. 이미지 ZIP을 따로 설치할 필요가 없습니다. [테마 설치 안내](THEMES-INSTALL.md)

## 자동 업데이트

각 스크립트의 `@downloadURL`은 이 저장소의 `main` 브랜치에 있는 `.user.js` 파일을 가리킵니다. `@updateURL`은 새 버전 확인용 주소이며, 배경·테마 스크립트는 같은 이름의 `.meta.js` 파일을 사용합니다. 새 버전을 배포할 때는 해당 파일을 교체하고 userscript 헤더의 `@version`을 이전보다 높여 주세요. Tampermonkey가 새 버전을 확인할 수 있습니다.

## 파일

- `crack-mobile-utility.user.js`
- `crack-txt-chatgpt-mobile.user.js`
- `crack-muse-writer.user.js`
- `crack-profile-box.user.js`

- `crack-theme-background.user.js` / `crack-theme-background.meta.js`
- `crack-custom-room-background.user.js` / `crack-custom-room-background.meta.js`
- `assets/theme-images/` — 자동으로 불러오는 테마 이미지

## 주의

- 이 저장소에 API 키, 토큰, 비밀번호 같은 개인 비밀정보를 직접 적어 올리지 마세요.
- 스크립트가 외부 AI/API를 사용하는 경우 실제 요청은 사용자가 설정한 API와 해당 서비스의 정책을 따릅니다.
- 사이트 구조가 바뀌면 일부 기능이 동작하지 않을 수 있습니다.

제작자: **chu**

