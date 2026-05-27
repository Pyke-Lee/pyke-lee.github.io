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
엔진이나 외부 그래픽 라이브러리 없이 **C++과 WinAPI(GDI)만으로** 게임의 핵심 시스템을 구현하는 것을 목표로 했습니다.

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

<details class="code-block">
<summary>AbstractFactory.h <span class="file-badge">템플릿 팩토리</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "Obj.h"

template&lt;typename T&gt;
class CAbstractFactory {
public:
static CObj* Create() {
CObj* pObj = new T;
pObj-&gt;Initialize();
return pObj;
}
};</code></pre>
</details>

## 주요 구현 내용

### 플레이어 시스템

이동, 점프, 대시(3회 충전 + 시간 기반 회복), 허기(Food) 시스템을 구현했습니다.
능력치는 분노(공격력)·인내(방어력)·신비·탐욕·집중 5종으로 구성되며, 마우스 위치 기준으로 캐릭터 좌우 반전과 무기 조준이 동작합니다.

<details class="code-block">
<summary>Player.h <span class="file-badge">플레이어 클래스 구조</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "Entity.h"

#define DEFAULT_PLAYER_HP 100
#define DEFAULT_PLAYER_FOOD 100
#define DEFAULT_PLAYER_DASH_COUNT 3
#define DEFAULT_PLAYER_MOVE_SPEED 6.f
#define DEFAULT_PLAYER_PICKUP_RADIUS 150.f
#define DASH_REGEN_TIME 1500

#define ABILITY_WRATH		2
#define ABILITY_PATIENCE	1
#define ABILITY_MYSTIC		1
#define ABILITY_GREED		2
#define ABILITY_FOCUS		2
#define ABILITY_MAX			20

class CPlayer : public CEntity {
    public:
        enum STATE { IDLE, WALK, RUN, JUMP, DEAD, END };
        enum ABILITY { WRATH, PATIENCE, MYSTIC, GREED, FOCUS, ABILITY_END };
    
    public:
        virtual void Initialize() override;
        virtual int Update() override;
        virtual void Late_Update() override;
        virtual void Render(HDC hDC) override;
        virtual void Release() override;
        virtual bool Take_Damage(int _iDmg) final override;
    
    public:
        int Get_Pow() { return (m_iPow + (m_iWrath * ABILITY_WRATH)); }
        int Get_Defence() { return (m_iDefence + (m_iPatience * ABILITY_PATIENCE)); }
    
    private:
        void Get_Key();
        void Jumping();
        void Dash();
        void Chasing_Mouse();
        void Motion_Change();
        void Find_Item_Radius();
        void Attack();
        void Update_HandPos();
    
    private:
        bool m_bJump = false;
        bool m_bDash = false;
        bool m_bDoubleJump = false;
    
        int m_iMaxDash = 3;
        int m_iDashCount = 3;
        int m_iMoney = 0;
    
        STATE m_ePrevState = END;
        STATE m_eCurState = IDLE;
    
        CObj* m_pMainHand = nullptr;
        CObj* m_pSubHand = nullptr;
    
        int m_iPow = 0;
        int m_iDefence = 0;
        int m_iCritical = 0;
        int m_iCriticalDmg = 50;
        int m_iWrath = 0;
        int m_iPatience = 0;
        int m_iMystic = 0;
        int m_iGreed = 0;
        int m_iFocus = 0;
};</code></pre>
</details>

### 전투 및 무기

무기는 한손검(Gladius), 양손검(GreatSword), 방패(RoundShield), 총기(Colt) 4종으로 분류됩니다.
각 타입별 공격 패턴과 딜레이가 다르며, `PlgBlt` 기반 회전 렌더링으로 마우스 방향에 따라 무기가 회전합니다.
투사체는 무기·몬스터별로 독립된 Bullet 클래스로 구현했습니다.

<details class="code-block">
<summary>Weapon.h <span class="file-badge">무기 기반 클래스</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "Item.h"

class CWeapon : public CItem {
public:
    enum TYPE { ONE, TWO, GUN, END };

public:
    virtual void Initialize() PURE;
    virtual int Update() PURE;
    virtual void Late_Update() PURE;
    virtual void Render(HDC hDC) PURE;
    virtual void Release() PURE;
    virtual void PickUp() PURE;

public:
void  Rotate();

	TYPE  Get_WeaponType() { return m_eWeaponType; }
	bool  Get_Equip()	    { return m_bEquip; }

protected:
POINT m_tPoint[3] { {0,0}, {0,0}, {0,0} };
bool  m_bEquip = false;
TYPE  m_eWeaponType = END;
int   m_iPrice = 0;
DWORD m_dwDelayTime = 0;
TCHAR m_pName[256] = L"";
};</code></pre>
</details>

<details class="code-block">
<summary>Colt_Bullet.cpp — Render <span class="file-badge">PlgBlt 회전 렌더링</span></summary>
<pre markdown="0"><code class="language-cpp">void CColt_Bullet::Render(HDC hDC) {
	int iScrollX = (int)CScrollMgr::Get_Instance()-&gt;Get_ScrollX();
	int iScrollY = (int)CScrollMgr::Get_Instance()-&gt;Get_ScrollY();

	HDC hPlgDC = CBmpMgr::Get_Instance()-&gt;Find_Img(L"Base");
	HDC hResetDC = CBmpMgr::Get_Instance()-&gt;Find_Img(L"Reset");

	if (m_eCurState == IDLE) {
		HDC hMemDC = CBmpMgr::Get_Instance()-&gt;Find_Img(L"Colt_Bullet");
		PlgBlt(hPlgDC, m_tPoint, hMemDC, 0, 0, 30, 30, NULL, NULL, NULL);
		GdiTransparentBlt(hDC, (int)(m_tInfo.fX - (m_tInfo.fCX * 0.5f) + iScrollX), (int)(m_tInfo.fY - (m_tInfo.fCY * 0.5f) + iScrollY), 30, 30, hPlgDC, 0, 0, 30, 30, RGB(255, 0, 255));
		BitBlt(hPlgDC, 0, 0, 30, 30, hResetDC, 0, 0, SRCCOPY);
	}
	else {
		HDC hMemDC = CBmpMgr::Get_Instance()-&gt;Find_Img(L"Effect_Bullet");
		PlgBlt(hPlgDC, m_tPoint, hMemDC, (int)(m_tFrame.iFrameStart * 30), 0, 30, 30, NULL, NULL, NULL);
		GdiTransparentBlt(hDC, (int)(m_tInfo.fX - (m_tInfo.fCX * 0.5f) + iScrollX), (int)(m_tInfo.fY - (m_tInfo.fCY * 0.5f) + iScrollY), 30, 30, hPlgDC, 0, 0, 30, 30, RGB(255, 0, 255));
		BitBlt(hPlgDC, 0, 0, 30, 30, hResetDC, 0, 0, SRCCOPY);
	}
}</code></pre>
</details>

### 몬스터 및 보스

일반 몬스터 4종(Banshee, RedGiantBat, Minotaur, GiantSkeleton)은 각각 원거리/근거리 공격 패턴을 가지며, 자체 중력·낙하 시스템과 타일 충돌 기반 착지 판정으로 동작합니다.

보스 Belial은 다관절 구조(Hand 분리), 검 소환(Belial_Sword), 4방향 나선 탄막(Belial_Bullet) 등 복합 패턴으로 구현했습니다.

<details class="code-block">
<summary>Belial_Sword.cpp — Rotate <span class="file-badge">보스 검 회전 좌표 계산</span></summary>
<pre markdown="0"><code class="language-cpp">void CBelial_Sword::Rotate() {
	if (!m_bFire) {
		POINT ptBullet { (LONG)m_tInfo.fX, (LONG)m_tInfo.fY };
		POINT ptPlayer { (LONG)CObjMgr::Get_Instance()-&gt;Get_Player()-&gt;Get_Collider_Info().fX, (LONG)CObjMgr::Get_Instance()-&gt;Get_Player()-&gt;Get_Collider_Info().fY };
		m_fAngle = CObjMgr::Get_Instance()-&gt;Find_Angle_AtoB(ptPlayer, ptBullet);

		float _fAngle = -m_fAngle - 90.f;

		float fDiagonal = sqrtf(powf((m_tInfo.fCX * 0.5f), 2) + powf((m_tInfo.fCY * 0.5f), 2));

		m_tPoint[0].x = LONG((m_tInfo.fCX * 0.5f) + (fDiagonal * cosf((_fAngle + 225.f) * (PI / 180.f))));
		m_tPoint[0].y = LONG((m_tInfo.fCY * 0.5f) + (fDiagonal * sinf((_fAngle + 225.f) * (PI / 180.f))));

		m_tPoint[1].x = LONG((m_tInfo.fCX * 0.5f) + (fDiagonal * cosf((_fAngle + 315.f) * (PI / 180.f))));
		m_tPoint[1].y = LONG((m_tInfo.fCY * 0.5f) + (fDiagonal * sinf((_fAngle + 315.f) * (PI / 180.f))));

		m_tPoint[2].x = LONG((m_tInfo.fCX * 0.5f) + (fDiagonal * cosf((_fAngle + 135.f) * (PI / 180.f))));
		m_tPoint[2].y = LONG((m_tInfo.fCY * 0.5f) + (fDiagonal * sinf((_fAngle + 135.f) * (PI / 180.f))));
	}
}</code></pre>
</details>

<details class="code-block">
<summary>Boss_Belial.cpp — Create_Bullet <span class="file-badge">4방향 나선 탄막</span></summary>
<pre markdown="0"><code class="language-cpp">void CBoss_Belial::Create_Bullet() {
	CSoundMgr::Get_Instance()-&gt;PlaySoundW(L"SFX_Belial_Bullet.wav", SOUND_EFFECT, 1.f);

	if (m_bRight) { m_fAngle += 5.f; }
	else { m_fAngle -= 5.f; }

	CObj* pBullet = CAbstractFactory&lt;CBelial_Bullet&gt;::Create();
	pBullet-&gt;Set_Pos(m_tInfo.fX, (m_tInfo.fY + 110));
	pBullet-&gt;Set_Angle(m_fAngle);
	CObjMgr::Get_Instance()-&gt;Add_Object(OBJ_BULLET, pBullet);

	pBullet = CAbstractFactory&lt;CBelial_Bullet&gt;::Create();
	pBullet-&gt;Set_Pos(m_tInfo.fX, (m_tInfo.fY + 110));
	pBullet-&gt;Set_Angle((m_fAngle + 90.f));
	CObjMgr::Get_Instance()-&gt;Add_Object(OBJ_BULLET, pBullet);

	pBullet = CAbstractFactory&lt;CBelial_Bullet&gt;::Create();
	pBullet-&gt;Set_Pos(m_tInfo.fX, (m_tInfo.fY + 110));
	pBullet-&gt;Set_Angle((m_fAngle + 180.f));
	CObjMgr::Get_Instance()-&gt;Add_Object(OBJ_BULLET, pBullet);

	pBullet = CAbstractFactory&lt;CBelial_Bullet&gt;::Create();
	pBullet-&gt;Set_Pos(m_tInfo.fX, (m_tInfo.fY + 110));
	pBullet-&gt;Set_Angle((m_fAngle + 270.f));
	CObjMgr::Get_Instance()-&gt;Add_Object(OBJ_BULLET, pBullet);
}</code></pre>
</details>

### 던전 및 스테이지

Town → Dungeon 5층(F0~F4) → Boss 순서로 진행되는 스테이지 구조입니다.
StageMgr가 각 층의 인스턴스를 vector로 관리하며, 전진·후퇴 시 몬스터·아이템 상태를 보존합니다.
Gate 오브젝트를 통해 층간 이동이 이루어지며, 몬스터 전멸 시 다음 층이 개방됩니다.

<details class="code-block">
<summary>StageMgr.cpp — Set_Stage <span class="file-badge">스테이지 전환 및 상태 보존</span></summary>
<pre markdown="0"><code class="language-cpp">void CStageMgr::Set_Stage(STAGEID eID) {
	m_eCurStage = eID;

	if (m_ePrevStage != m_eCurStage) {
		CSoundMgr::Get_Instance()-&gt;StopAll();

		if (!(CObjMgr::Get_Instance()-&gt;Get_GateList()-&gt;empty())) {m_pStage-&gt;Get_GateList()-&gt;splice((m_pStage-&gt;Get_GateList()-&gt;end()), (*CObjMgr::Get_Instance()-&gt;Get_GateList())); }
		if (!(CObjMgr::Get_Instance()-&gt;Get_MonsterList()-&gt;empty())) { m_pStage-&gt;Get_MonsterList()-&gt;splice((m_pStage-&gt;Get_MonsterList()-&gt;end()), (*CObjMgr::Get_Instance()-&gt;Get_MonsterList())); }

		CObjMgr::Get_Instance()-&gt;Delete_Object(OBJ_BULLET);
		CObjMgr::Get_Instance()-&gt;Delete_Object(OBJ_UI);
		CTileMgr::Get_Instance()-&gt;Release();

		if ((m_ePrevStage == ST_DF4 &amp;&amp; m_eCurStage == ST_BOSS) || m_eCurStage == ST_TOWN) {
			std::for_each(m_vecDungeon.begin(), m_vecDungeon.end(), Safe_Delete&lt;CStage*&gt;);
		}

		switch (m_eCurStage) {
		case ST_TOWN:	m_pStage = new CTown;	break;
		case ST_DF0:
			if (!m_vecDungeon[0]) m_vecDungeon[0] = new CDungeon_F0;
			m_pStage = m_vecDungeon[0];
			break;
		case ST_BOSS:	m_pStage = new CBoss;	break;
		}

		m_pStage-&gt;Initialize();
		m_ePrevStage = m_eCurStage;
	}
}</code></pre>
</details>

### 타일 에디터

Edit 씬에서 타일을 배치·삭제할 수 있는 자체 맵 에디터를 구현했습니다.
배경 타일(BackTile)과 충돌 타일(FrontTile)을 분리하여 관리하며, 파일 저장·로드를 통해 각 스테이지의 맵 데이터를 관리합니다.

### 아이템 및 경제

코인은 몬스터 처치 시 포물선 드롭 연출 후 바닥에 착지하며, 플레이어가 일정 반경(150px) 내에 접근하면 삼각함수 기반 호밍으로 자동 흡수됩니다.
인벤토리 슬롯 시스템으로 무기를 장착·교체할 수 있고, 상점(Shop)과 식당(Restaurant), 보물상자(TreasureChest) 시스템을 구현했습니다.

<details class="code-block">
<summary>Item.cpp — DropItem <span class="file-badge">아이템 드롭 & 호밍 흡수</span></summary>
<pre markdown="0"><code class="language-cpp">void CItem::DropItem() {
	if (m_bSpawn) {
		float fJumpPower = m_fPower * m_fTime - GRAVITY * powf(m_fTime, 2) * 0.5f;
		if (fJumpPower &lt; -16.f) { fJumpPower = -16.f; }
		m_tInfo.fY -= fJumpPower;
		m_fTime += 0.2f;
	}
	else if (!m_bSpawn &amp;&amp; !m_bPickUp) {
		m_fFallSpeed += m_fSpeed;
		if (m_fFallSpeed &gt; 16.f) { m_fFallSpeed = 16.f; }
		m_tInfo.fY += m_fFallSpeed;
	}
	else if (!m_bSpawn &amp;&amp; m_bPickUp &amp;&amp; m_eItemType == ITEM_MONEY) {
		Find_Target();
		m_tInfo.fX += m_fSpeed * cosf(m_fAngle * (PI / 180.f));
		m_tInfo.fY -= m_fSpeed * sinf(m_fAngle * (PI / 180.f));
	}
}

void CItem::Find_Target() {
POINT ptTarget{}, ptItem{};
ptTarget.x = (long)CObjMgr::Get_Instance()-&gt;Get_Player()-&gt;Get_Info().fX;
ptTarget.y = (long)CObjMgr::Get_Instance()-&gt;Get_Player()-&gt;Get_Info().fY;
ptItem.x = (long)m_tInfo.fX;
ptItem.y = (long)m_tInfo.fY;
m_fAngle = CObjMgr::Get_Instance()-&gt;Find_Angle_AtoB(ptTarget, ptItem);
}</code></pre>
</details>

### NPC 상호작용

5종 NPC(Shopper, Giant, InnKeeper, Commander, Butler)를 구현했습니다.
RECT 교차 판정으로 상호작용 범위를 감지하며, 플레이어가 근접하면 대화·거래 UI가 활성화됩니다.

### 렌더링 최적화

GDI 더블 버퍼링으로 화면 깜빡임을 방지하고, 타일 렌더링에 뷰포트 기반 컬링을 적용하여 화면 밖 타일의 렌더를 생략했습니다.

## GDI 이미지 회전과 성능 대응

WinAPI의 GDI로 이미지를 회전시키려면 일반적으로 픽셀 단위 변환이 필요해 프레임 저하가 심합니다.
GDI+를 전면 도입하면 해결할 수 있지만, 약 1개월의 한정된 개발 기간 안에 기존 GDI 기반 렌더링 파이프라인을 전부 전환하는 것은 비현실적이었습니다.

이를 해결하기 위해 **GDI+를 사용하지 않고** GDI의 `PlgBlt` 함수를 활용했습니다.
`PlgBlt`는 원본 사각형을 대상 평행사변형에 매핑하는 함수로, 삼각함수로 회전 각도에 따른 세 꼭짓점 좌표(`POINT[3]`)를 직접 계산하여 전달하면 GDI만으로 이미지 회전이 가능합니다.

이 방식을 무기 렌더링과 보스의 검 소환 연출 등 **회전이 반드시 필요한 최소한의 오브젝트에만 적용**하여, GDI+ 없이도 프레임 저하를 방지했습니다.