---
layout: project
title: Dungreed 모작 (WinAPI)
subtitle: C++과 WinAPI만으로 구현한 2D 로그라이크 액션 게임
youtube_id: 0cO1UhW1g5g
period: 2024.04 ~ 2024.05 (약 1개월)
team: 1인 개발
role: 전체 (설계, 구현, 타일 에디터, 사운드)
tech: [C++, WinAPI, GDI, FMOD]
github: https://github.com/Pyke-Lee/Jusin-Project/tree/main/3%EA%B0%9C%EC%9B%94/3%EA%B0%9C%EC%9B%94%EC%B0%A8%20API%20%EC%8B%9C%EC%97%B0%ED%9A%8C%20%EB%8D%98%EA%B7%B8%EB%A6%AC%EB%93%9C%20%EB%AA%A8%EC%9E%91
---

## 프로젝트 개요

자주 즐기던 로그라이크 액션 게임 Dungreed를 WinAPI로 모작한 개인 프로젝트입니다.
엔진이나 외부 그래픽 라이브러리 없이 C++과 WinAPI(GDI)만으로 게임의 핵심 시스템을 구현하는 것을 목표로 했습니다.

## 아키텍처

싱글톤 매니저 패턴을 기반으로 각 시스템을 독립된 매니저 클래스로 분리했습니다.

- **ObjMgr** — 오브젝트 생성·소멸·렌더 순서 관리
- **SceneMgr / StageMgr** — 씬 전환(Logo → Menu → Game)과 스테이지 전환(Town → Dungeon F0~F4 → Boss) 분리
- **CollisionMgr / LineMgr** — RECT 기반 충돌과 라인 기반 지형 충돌을 별도로 처리
- **TileMgr** — 타일맵 로드·렌더·컬링, 자체 타일 에디터(Edit 씬) 지원
- **BmpMgr** — 비트맵 리소스 로드 및 더블 버퍼링 렌더
- **SoundMgr** — FMOD 기반 BGM·효과음 관리
- **ScrollMgr** — 카메라 스크롤 및 뷰포트 좌표 변환
- **UIMgr / TextMgr** — HUD, 데미지 텍스트 팝업

오브젝트 생성에는 Abstract Factory 패턴을 사용하고, 게임 루프는 `GetTickCount64` 기반 10ms 고정 타임스텝으로 동작합니다.

## 주요 구현 내용

### 플레이어 시스템
- 이동, 점프, 대시(3회 충전 + 시간 기반 회복), 허기(Food) 시스템
- 능력치 시스템: 분노(공격력)·인내(방어력)·신비·탐욕·집중 5종 스탯 강화
- 마우스 기준 좌우 반전 및 무기 조준

### 전투 및 무기
- 무기 타입 분류: 한손검(Gladius), 양손검(GreatSword), 방패(RoundShield), 총기(Colt)
- 한손/양손/원거리 무기별 공격 패턴과 딜레이 차별화
- PlgBlt 기반 무기 회전 렌더링 — 삼각함수로 POINT[3] 좌표를 계산하여 GDI만으로 이미지 회전 구현
- 투사체 시스템: 무기·몬스터별 독립된 Bullet 클래스 (Colt_Bullet, Banshee_Bullet, Belial_Bullet 등)

### 몬스터 및 보스
- 일반 몬스터 4종: Banshee(원거리), RedGiantBat(원거리), Minotaur(근거리), GiantSkeleton(근거리)
- 자체 중력·낙하 시스템, 타일 충돌 기반 착지 판정
- 보스 Belial: 다관절 구조(Hand 분리), 검 소환(Belial_Sword), 탄막(Belial_Bullet) 등 복합 패턴

### 던전 및 스테이지
- Town → Dungeon 5층(F0~F4) → Boss 순서의 스테이지 진행 구조
- StageMgr가 각 층 인스턴스를 vector로 관리하며 전진·후퇴 시 상태 보존
- Gate 오브젝트를 통한 층간 이동, 몬스터 전멸 시 다음 층 개방

### 타일 에디터
- Edit 씬에서 타일 배치·삭제 가능한 자체 맵 에디터
- 배경 타일과 충돌 타일을 분리(BackTile / FrontTile)하여 관리
- 파일 저장·로드를 통해 각 스테이지 맵 데이터 관리

### 아이템 및 경제
- 코인 드롭 → 플레이어 주변 자동 흡수 (Pickup Radius 150px, 호밍 이동)
- 인벤토리 슬롯 시스템, 무기 장착·교체
- 상점(Shop): NPC 상호작용으로 무기 구매·판매
- 식당(Restaurant): 음식 구매를 통한 허기 회복·스탯 버프
- 보물상자(TreasureChest) 보상

### NPC 상호작용
- 5종 NPC: Shopper, Giant, InnKeeper, Commander, Butler
- RECT 교차 판정 기반 상호작용 범위 감지, 근접 시 대화·거래 UI 활성화

### 렌더링 최적화
- GDI 더블 버퍼링으로 화면 깜빡임 방지
- 타일 렌더링에 뷰포트 기반 컬링 적용 — 화면 밖 타일은 렌더 생략

## GDI 이미지 회전과 성능 대응

WinAPI의 GDI로 이미지를 회전시키려면 일반적으로 픽셀 단위 변환이 필요해 프레임 저하가 심합니다.
GDI+를 전면 도입하면 해결할 수 있지만, 약 1개월의 한정된 개발 기간 안에 기존 GDI 기반 렌더링 파이프라인을 전부 전환하는 것은 비현실적이었습니다.

이를 해결하기 위해 GDI+를 사용하지 않고 GDI의 `PlgBlt` 함수를 활용했습니다.
`PlgBlt`는 원본 사각형을 대상 평행사변형에 매핑하는 함수로, 삼각함수로 회전 각도에 따른 세 꼭짓점 좌표(POINT[3])를 직접 계산하여 전달하면 GDI만으로 이미지 회전이 가능합니다.

이 방식을 무기 렌더링과 보스의 검 소환 연출 등 **회전이 반드시 필요한 최소한의 오브젝트에만 적용**하여, GDI+ 없이도 프레임 저하를 방지했습니다.