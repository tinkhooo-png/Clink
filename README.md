# 심플 가계부

기록, 통계, 설정 세 가지만 있는 가계부입니다. 한 코드로 PC 프로그램(Windows 설치 파일), 안드로이드 앱(홈 화면 위젯 2종 포함), 웹이 함께 만들어집니다. 계정으로 로그인하면 모든 기기의 기록이 실시간으로 맞춰집니다.

## 1. 구성

| 위치 | 내용 |
| --- | --- |
| `src/` | 앱 화면(기록·통계·마이), 저장소, 동기화 |
| `electron/` | PC 프로그램 (Electron) |
| `android/` | 안드로이드 앱 (Capacitor) + 위젯 (`app/src/main/java/.../widget`) |
| `firestore.rules` | 서버 보안 규칙 (각자 자기 기록만 접근) |
| `.github/workflows/build.yml` | APK와 EXE를 자동으로 빌드 |

## 2. 바로 써 보기 (계정 없이)

계정 설정 없이도 앱은 동작합니다. 이 경우 기록은 그 기기에만 저장됩니다.

```bash
npm install
npm run dev          # 브라우저에서 확인
npm run electron     # PC 프로그램으로 실행
```

## 3. 계정·실시간 동기화 켜기 (Firebase, 무료 요금제로 충분)

1. https://console.firebase.google.com 에서 프로젝트를 만듭니다.
2. **Authentication → 로그인 방법**에서 `이메일/비밀번호`를 사용 설정합니다.
3. **Firestore Database → 데이터베이스 만들기**(위치: `asia-northeast3` 서울)를 누릅니다.
4. **Firestore → 규칙** 탭에 `firestore.rules` 내용을 붙여 넣고 게시합니다.
5. **프로젝트 설정 → 내 앱 → 웹 앱 추가**에서 나온 값을 `.env.example`을 복사한 `.env`에 채웁니다.

로그인하면 그 기기에 있던 기록은 계정으로 자동으로 옮겨집니다. 인터넷이 끊겨도 기록되고, 연결되면 자동으로 올라갑니다.

## 4. 설치 파일 만들기 (GitHub Actions)

컴퓨터에 안드로이드 스튜디오를 설치하지 않아도 됩니다.

1. 이 폴더를 GitHub 저장소(비공개 권장)에 올립니다.
2. **Settings → Secrets and variables → Actions**에 `.env`의 6개 값을 같은 이름으로 등록합니다.
3. `main`에 올릴 때마다 **Actions** 탭에서 `SimpleLedger.apk`, `SimpleLedger-Setup-1.0.0.exe`를 내려받을 수 있습니다.
4. `v1.0.0`처럼 태그를 붙이면 **Releases**에 두 파일이 올라가 링크로 나눠 줄 수 있습니다.

- APK는 휴대폰에서 파일을 열면 설치됩니다. 처음 한 번 “출처를 알 수 없는 앱 설치”를 허용해야 합니다.
- EXE는 서명하지 않은 파일이라 Windows SmartScreen이 경고를 띄웁니다. “추가 정보 → 실행”을 누르면 설치됩니다.
- Play 스토어에 올리려면 서명 키를 만들고 `assembleRelease`(또는 `bundleRelease`)로 바꿔야 합니다.

직접 빌드하려면 `npm run dist:win`(Windows에서), `npm run android:sync` 후 `npm run android:open`(안드로이드 스튜디오)을 씁니다.

## 5. 위젯 (안드로이드)

- **빠른 기록(4×4)**: 키패드로 금액을 누르고 카테고리를 누르면 바로 저장됩니다. 로그인 상태면 앱을 열지 않아도 서버로 올라가 PC에 바로 나타납니다. 인터넷이 없으면 기기에 보관했다가 앱을 열 때 올립니다.
- **이번 달 요약(2×2)**: 이번 달 지출, 오늘 지출, 수입을 보여 주고 누르면 앱이 열립니다.
- 위젯에 나오는 카테고리는 마이 → 카테고리에서 숨기지 않은 것 중 위에서부터 6개입니다.
- 안드로이드 위젯은 글자 입력칸을 넣을 수 없어서, 금액 입력은 위젯 안 키패드로 만들었습니다.

## 6. 디자인 기준

- Orange TDS: 버튼 규격(56px/16px), 타입 토큰 t1–t7, `primary` #c45000은 누르는 것에만, `brand` #ff803d는 3D 오브제에만 씁니다.
- 2D 아이콘: 하단 탭(채움형), 정렬·필터·이동 버튼(선형). 기능을 나타내는 곳은 모두 2D입니다.
- 3D 오브제(orb): 한 화면에 한 번, 가치를 보여 주는 자리에만 씁니다. 빈 기록 안내, 빈 통계, 계정 카드, 앱 아이콘.
- 카테고리 색은 TDS 분류 팔레트에서 고릅니다. 이모지는 쓰지 않습니다.

## 7. 나중에 할 일

- iOS 앱과 위젯: Capacitor iOS 프로젝트 + WidgetKit(Swift) 확장. 웹 화면과 동기화 코드는 그대로 씁니다.
- 디자인 시스템의 실제 오브제 SVG(`assets/Objects`)로 orb 교체.
