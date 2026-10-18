# RESONANCE — 공명 기록 보관소

세계관 「RESONANCE」의 아카이브 홈페이지. 대륙 베르툼, 여섯 오리진, 세 기관의 기록을 담는다.

- 색감: 블루 + 무채색 블랙 / 디자인 레퍼런스: 니어 오토마타 UI
- 폰트: Zen Dots(제목), Pretendard(본문), Share Tech Mono(HUD)
- 빌드 과정 없는 정적 사이트 (HTML / CSS / JS). Three.js r128은 `js/vendor/`에 포함

## 화면 구성

| 화면 | 내용 |
| --- | --- |
| 접속 화면 | 비밀기관 터미널에 로그인하는 연출 → 로딩 → 메인. `SKIP` 버튼 또는 Enter로 건너뛸 수 있고, 같은 탭에서 다시 열면 짧게 재생된다. |
| 메인 | 중앙에 회전하는 행성(드래그로 회전, 휠로 확대). 베르툼 지도 위에 지역 ◇ · 기관 ■ · 오리진 본체 ● 표시. 마우스를 올리면 그 요소만 밝아지고, 클릭하면 기록 창이 열린다. |
| 01 WORLD | 대침묵 · 최초의 희생 · 현재, 주인공, 재건력 연표 |
| 02 RESONANCE | 지휘자(전투 유형 도식), 레조넌트(등급 피라미드), 오리진 개요 |
| 03 DISSONANT | 등급별 분포 막대, 아리아 개체 기록, 디소넌스 변이 단계 |
| 04 REGIONS | 지역별 대표 이미지 · 미니맵 · 위협도 · 색 팔레트 · 구역(클릭 시 팝업) · 생활상 |
| 05 FACTIONS | 행동 이념 · 미니맵 위치 · 주요 업무 · 구성원 슬롯(클릭 시 프로필 팝업) |
| 06 ORIGINS | 여섯 오리진 프로필. **초월자 시절 기록 열람** 버튼을 누르면 프로필이 스포일러 내용으로 바뀐다. |
| 07 PERSONNEL | 기관별 지휘자 · 레조넌트 계약 쌍, 플러터 |

스포일러 블록은 `열람 ▸`을 누르기 전까지 본문이 페이지에 들어가지 않는다.

## 파일 구조

```
index.html          화면 뼈대
css/style.css       전체 스타일 (색 토큰은 파일 상단 :root)
js/data.js          세계관 데이터 — 내용 수정은 여기서
js/mapgeo.js        지도 형상(해안선 · 섬) — 행성 텍스처와 미니맵이 공유
js/globe.js         3D 행성 · 마커
js/app.js           접속 화면 · 창 · 팝업 · 프로필
js/vendor/          three.min.js (r128, MIT)
assets/img/         이미지 슬롯 — 파일 이름은 assets/README.md 참고
```

## 이미지 넣기

`assets/README.md`에 슬롯별 파일 경로가 정리되어 있다. 해당 경로에 `.webp` / `.png` / `.jpg` 중 하나로 넣으면 자동으로 표시된다.

## 로컬에서 보기

```bash
python3 -m http.server 8000
# http://localhost:8000
```

`index.html`을 바로 더블클릭해서 열어도 동작한다.

## 배포 (GitHub Pages)

저장소 **Settings → Pages → Build and deployment**에서 Source를 `Deploy from a branch`, 브랜치를 배포할 브랜치의 `/ (root)`로 지정하면 된다.
