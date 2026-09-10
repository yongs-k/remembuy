# REMEMBUY MVP — 설계 문서

날짜: 2026-09-10
원본 스펙: `REMEMBUY_스펙_안티그래비티용.md`

## 1. 범위

- 1단계 MVP만 구현: **localStorage 기반 로컬 전용** 웹 앱
- 공유 피드 / 가족 케어는 실제 서버 연동 없이, 고정 더미 데이터 + 로컬 저장까지만 동작
- 디자인 기준이 되는 별도 HTML 프로토타입은 없음 — 원본 스펙 6번(디자인 가이드)을 기준으로 새로 디자인

## 2. 아키텍처

- **Vite + React + TypeScript + Tailwind CSS**, 순수 SPA (백엔드 없음)
- 개발 서버 포트 고정: `http://localhost:7777` (`vite.config.ts`의 `server.port: 7777`)
- 라우팅: `react-router-dom`, 7개 라우트 (홈 / 상품상세 / 랭킹 / 알림 / 공유피드 / 가족케어 / 새로기록)
- 상태 관리: 별도 라이브러리 없이 React Context + `useReducer`로 "보관함(Locker)" 전역 상태 하나만 관리
- 영속성: 커스텀 훅 `useLocalStorage`로 Context 상태를 `localStorage`에 자동 동기화. 저장된 데이터가 없으면 시드 데이터를 주입
- 공유 피드 / 가족 케어 데이터는 사용자 보관함과 분리된 별도 더미 데이터셋(고정 JSON)으로 표시. 공유 피드의 "저장하기"는 해당 항목을 복사해 내 로컬 보관함에 추가

## 3. 데이터 모델

```ts
type Location = { id: string; name: string; colorToken: string }
type Category = { id: string; locationId: string; name: string }
type Item = {
  id: string
  name: string
  locationId: string
  categoryId: string
  note?: string
  rating?: number          // rating과 daysUntilEmpty는 상호 배타적
  daysUntilEmpty?: number
  place?: string           // 구매처
  restockCycle?: string | null
  affiliateUrl?: string | null
  createdAt: string
}
```

- `Location`/`Category`는 별도 엔티티로 관리하고 `Item`은 id로 참조 (이름 변경 시 items 전체를 건드리지 않기 위함)
- `restockCycle`이 의미 없는 카테고리(상의·하의·아우터, 침구, 구급용품 등)는 `null` 허용
- `rating` vs `daysUntilEmpty`는 등록 폼에서 토글로 택1

### 기본 장소 9개 및 카테고리

| 장소 | 카테고리 |
|---|---|
| 욕실 | 헤어케어, 바디케어, 구강케어, 스킨케어, 위생용품 |
| 주방 | 식료품, 생활용품, 보관용품 |
| 세탁실/다용도실 | 세탁용품, 청소용품 |
| 옷장/드레스룸 | 상의·하의·아우터, 의류관리용품 |
| 화장대 | 메이크업, 헤어스타일링, 향 |
| 침실 | 침구, 공기관리 |
| 거실 | 청소용품, 소모 잡화 |
| 현관/신발장 | 신발관리, 외출용품 |
| 상비약함 | 구급용품 |
| 차량 | 차량용품 |

사용자가 장소/카테고리를 직접 추가·수정·삭제할 수 있어야 함(스펙 3번 요구사항 유지).

시드 데이터: 위 표의 대표 제품 예시를 활용해 장소마다 2~3개씩, 총 20개 내외.

## 4. 화면 구성 (7개)

1. **홈(보관함)** `/` — 검색창, 장소별 원형 아이콘 내비게이션(9개+전체), "전체·임박만" 필터 탭, 카테고리별 상품 카드 목록. 클릭 시 상세 이동
2. **상품 상세** `/item/:id` — 썸네일, 이름, 장소>카테고리 경로, 별점/D-day, 메모, 구매처, 재구매 주기, "다시 담기"(placeholder), "메모 수정하기"
3. **랭킹** `/ranking` — 카테고리 칩 선택 → 별점 내림차순 순위, 1위 "다시 살래요" 뱃지
4. **알림** `/notifications` — `daysUntilEmpty` 임박(7일 이하) 상품 목록, 예상 소진일, "다시 담기"
5. **공유 피드** `/feed` — 고정 더미 데이터 카드, "저장하기" → 내 로컬 보관함에 복사 추가
6. **가족 케어** `/family` — 더미 가족 계정 보관함 요약, "가족 초대하기"는 토스트만 표시
7. **새로 기록하기** `/new` — 이름, 장소→카테고리 연동 선택, 구매처, 재구매 주기, 별점/D-day 택1, 메모. 저장 시 홈 이동

공통 레이아웃: 하단 탭바(홈/랭킹/알림/공유/가족) + 홈 화면에 "새로 기록하기" 진입 버튼(플로팅 또는 상단).

## 5. 디자인 토큰

- 배경 `#E9DFC3`, 카드 `#F8F2E2`, 텍스트 `#2A2420`, 강조(도장) `#B0472E`, 보조강조 `#3F6459`, 경고/D-day `#B9822C`
- 장소 아이콘 색: 욕실 `#6E8F87`, 주방 `#C98F2B`, 세탁실 `#7D93A6`, 옷장 `#B0472E`, 나머지 5개(화장대/침실/거실/현관/상비약함/차량)는 같은 톤의 어스컬러 팔레트에서 확장 지정
- 폰트: 제목 `Gowun Batang`(Google Fonts), 본문 `IBM Plex Sans KR`
- 인덱스카드·크래프트지 톤: 카드에 은은한 종이 질감(box-shadow+border), 둥근 모서리, 도장 느낌의 강조 뱃지

## 6. 검증 계획

`npm run dev`로 `http://localhost:7777` 구동 후 브라우저에서 7개 화면 전부 클릭 테스트:
- 시드 데이터 로딩 확인
- 홈 검색/필터/장소 내비게이션
- 랭킹 카테고리별 정렬
- 알림 임박 판정 로직
- 공유 피드 "저장하기" → 홈 보관함 반영
- 새로 기록하기 → 저장 → 홈/랭킹/알림 반영까지 골든 패스
