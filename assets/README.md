# 이미지 슬롯 안내

아래 경로에 이미지를 넣으면 사이트의 해당 슬롯에 자동으로 표시됩니다.
경로에는 확장자가 없습니다. **`.webp` → `.png` → `.jpg`** 순서로 찾으니 셋 중 아무 형식이나 쓰면 됩니다.
파일이 없으면 빗금 무늬의 빈 슬롯이 대신 나옵니다.

예) 유스트 프로필 → `assets/img/characters/just.png`

### 썸네일과 상세 이미지 나누기
요약 슬롯(구역 카드, 기관 구성원, 인물 카드, 오리진 원형 슬롯)은 **파일 이름 뒤에 `-thumb`** 를 붙인 이미지를 먼저 찾습니다.
없으면 기본 이미지를 그대로 씁니다. 상세 화면(구역 팝업, 프로필 팝업)은 항상 기본 이미지를 씁니다.

| 쓰는 곳 | 파일 |
| --- | --- |
| 요약 슬롯 | `assets/img/characters/just-thumb.png` |
| 상세 화면 | `assets/img/characters/just.png` |

오리진 프로필의 초월자 시절 화면은 `-past`(예: `just-past.png`)를 먼저 찾고, 없으면 기본 이미지를 씁니다.

## 행성 지도 (선택)
- `assets/img/map/vertum` — 행성 텍스처를 직접 그린 지도로 바꾸고 싶을 때. **등장방형(가로:세로 = 2:1)** 이미지여야 합니다.
  넣지 않으면 코드로 그린 기본 지도가 쓰입니다. 교체해도 마커 위치는 `js/data.js`의 `markers` 좌표를 따르므로 맞춰 조정해야 합니다.

## 지역 대표 이미지 (가로형)
- `assets/img/regions/eirene` — 에이레네
- `assets/img/regions/iron-valley` — 아이언 밸리
- `assets/img/regions/lumina` — 루미나
- `assets/img/regions/silent-zone` — 사일런트 존

## 구역 썸네일
- `assets/img/zones/eirene-spire` — 에이레네 / 첨탑
- `assets/img/zones/eirene-academy` — 에이레네 / 사관학교
- `assets/img/zones/eirene-judgment` — 에이레네 / 판결의 극
- `assets/img/zones/eirene-repose` — 에이레네 / 안식의 극
- `assets/img/zones/eirene-blocks` — 에이레네 / 주거 블록
- `assets/img/zones/eirene-lower` — 에이레네 / 하층부
- `assets/img/zones/eirene-rampart` — 에이레네 / 방벽 터미널
- `assets/img/zones/iron-valley-furnace` — 아이언 밸리 / 용광로 섬
- `assets/img/zones/iron-valley-bazaar` — 아이언 밸리 / 고철 시장
- `assets/img/zones/iron-valley-chains` — 아이언 밸리 / 사슬 다리
- `assets/img/zones/iron-valley-mines` — 아이언 밸리 / 서부 광산 지대
- `assets/img/zones/iron-valley-gorge` — 아이언 밸리 / 녹음의 협곡
- `assets/img/zones/iron-valley-convoy` — 아이언 밸리 / 호위 정류장
- `assets/img/zones/lumina-temple` — 루미나 / 성궤 신전
- `assets/img/zones/lumina-coral` — 루미나 / 산호 시가지
- `assets/img/zones/lumina-spearpoint` — 루미나 / 창끝 해역
- `assets/img/zones/lumina-garden` — 루미나 / 망각의 정원
- `assets/img/zones/lumina-breakwater` — 루미나 / 방파 성벽
- `assets/img/zones/silent-zone-ruin` — 사일런트 존 / 제4외곽도시 폐허
- `assets/img/zones/silent-zone-corridor` — 사일런트 존 / 트레몰로 라인 회랑
- `assets/img/zones/silent-zone-plains` — 사일런트 존 / 동부 평원
- `assets/img/zones/silent-zone-vacuum` — 사일런트 존 / 서부 광산 지대 (불모의 진공)
- `assets/img/zones/ark-hall-tide` — 성궤 신전 / 해신의 회랑
- `assets/img/zones/ark-arena` — 성궤 신전 / 투신의 원형장
- `assets/img/zones/ark-sanctum` — 성궤 신전 / 투신의 성소

## 기관 대표 이미지 (가로형)
- `assets/img/factions/bureau` — 중앙집행국
- `assets/img/factions/fangs` — 강철의 송곳니
- `assets/img/factions/ark` — 성궤교단

## 인물 프로필 (세로형 3:4)
- `assets/img/characters/just` — 유스트 (초월자 시절: `assets/img/characters/just-past`, 없으면 기본 이미지 사용)
- `assets/img/characters/moss` — 모스 (초월자 시절: `assets/img/characters/moss-past`, 없으면 기본 이미지 사용)
- `assets/img/characters/chan` — 칸 (초월자 시절: `assets/img/characters/chan-past`, 없으면 기본 이미지 사용)
- `assets/img/characters/sis` — 시스 (초월자 시절: `assets/img/characters/sis-past`, 없으면 기본 이미지 사용)
- `assets/img/characters/kaien` — 카이엔 (초월자 시절: `assets/img/characters/kaien-past`, 없으면 기본 이미지 사용)
- `assets/img/characters/mary` — 메리 (초월자 시절: `assets/img/characters/mary-past`, 없으면 기본 이미지 사용)
- `assets/img/characters/hazard` — 해저드
- `assets/img/characters/odette` — 오데트
- `assets/img/characters/soil` — 소일
- `assets/img/characters/amon` — 아몬
- `assets/img/characters/deborah` — 데보라
- `assets/img/characters/sesha` — 세샤
- `assets/img/characters/flutter` — 플러터

## 아리아 기록 (세로형 3:4)
- `assets/img/aria/alpha` — 알파
- `assets/img/aria/cadenza` — 카덴차
- `assets/img/aria/elegy` — 엘레지
